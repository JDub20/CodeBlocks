// -*- mode: java; c-basic-offset: 2; -*-
// Copyright 2009-2011 Google, All Rights reserved
// Copyright 2011-2012 MIT, All rights reserved
// Released under the MIT License https://raw.github.com/mit-cml/app-inventor/master/mitlicense.txt

package com.google.appinventor.client.editor.youngandroid;

import static com.google.appinventor.client.Ode.MESSAGES;

import com.google.appinventor.client.ErrorReporter;
import com.google.appinventor.client.output.OdeLog;
import com.google.common.collect.Maps;
import com.google.gwt.core.client.JavaScriptException;
import com.google.gwt.user.client.ui.HTMLPanel;
import com.google.gwt.user.client.Timer;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Blocks editor panel.
 * The contents of the blocks editor panel is in an iframe identified by
 * the formName passed to the constructor. That identifier is also the hashtag
 * on the URL that is the source of the iframe. This class provides methods for
 * calling the Javascript Blockly code from the rest of the Designer.
 *
 * @author sharon@google.com (Sharon Perl)
 *
 */
public class BlocklyPanel extends HTMLPanel {
  public static enum OpType {ADD, REMOVE, RENAME}

  private static class ComponentOp {
    public OpType op;
    public String instanceName;     // for ADD, REMOVE, RENAME
    public String uid;              // for ADD, REMOVE, RENAME
    public String typeDescription;  // for ADD
    public String typeName;         // for REMOVE, RENAME
    public String oldName;          // for RENAME
  }

  private static class LoadStatus {
    public boolean complete = false; // true if loading blocks completed
    public boolean error = false;     // true if got an error loading blocks
  }

  private static final String EDITOR_HTML =
      "<style>\n" +
      ".svg {\n" +
      "  height: 100%;\n" +
      "  width: 100%;\n" +
      "  border: solid black 1px;\n" +
      "}\n" +
      "</style>\n" +
      "<iframe src=\"blocklyframe.html#FORM_NAME\" class=\"svg\">";

  // Keep track of component additions/removals/renames that happen before
  // blocks editor is inited for the first time, or before reinitialization
  // after the blocks editor's project has been detached from the document.
  // Replay them in order after initialized. Keys are form names. If there is
  // an entry for a given form name in the map, its blocks have not yet been
  // (re)inited.
  // Note: Javascript is single-threaded. Since this code is compiled by GWT
  // into Javascript, we don't need to worry about concurrent access to
  // this map.
  private static Map<String, List<ComponentOp>> componentOps = Maps.newHashMap();

  // When a user switches projects, the ProjectEditor widget gets detached
  // from the main document in the browser. If the user switches back to a
  // previously open project (in the same session), when the ProjectEditor
  // widget gets reattached, all of its FileEditors in its deckPanel get
  // reloaded, causing the Blockly objects for the blocks editors
  // to be created anew. Since the FileEditor Java objects themselves are
  // not recreated, we need to reconstruct the set of components in the Blockly
  // object when the object gets recreated. For each form, we keep track of the
  // components currently in that form, stored as "add" operations that can be
  // replayed to restore those components when the underlying Blockly state
  // is re-inited. This component state is updated as components are added,
  // removed, and renamed. The outer map is keyed by form name, and the
  // inner map is keyed by component uid.
  private static final Map<String, Map<String, ComponentOp>> currentComponents = Maps.newHashMap();

  // Pending blocks file content, indexed by form name. Waiting to be loaded when the corresponding
  // blocks area is initialized.
  private static final Map<String, String> pendingBlocksContentMap = Maps.newHashMap();

  // Status of blocks loading, indexed by form name.
  private static final Map<String, LoadStatus> loadStatusMap = Maps.newHashMap();

  // My form name
  private final String formName;
  private Timer timer;

  public BlocklyPanel(String formName) {
    super(EDITOR_HTML.replace("FORM_NAME", formName));
    this.formName = formName;
    componentOps.put(formName, new ArrayList<ComponentOp>());
    // note: using Maps.newHashMap() gives a type error in Eclipse in the following line
    currentComponents.put(formName, new HashMap<String, ComponentOp>());
    initJS();
    OdeLog.log("Created BlocklyPanel for " + formName);
  }

  /*
   * Do whatever is needed for App Inventor UI initialization. In this case
   * we just need to export the init components method so that we can
   * get called back from the Blockly Javascript when it finishes loading.
   */
  public static void initUi() {
    exportMethodsToJavascript();
  }

  /*
   * Initialize the blocks area so that it can be updated as components are
   * added, removed, or changed. Replay any previous component operations that
   * we weren't able to run before the blocks editor was initialized. This
   * method is static so that it can be called by the native Javascript code
   * after it finishes loading. We export this method to Javascript in
   * exportInitComponentsMethod().
   */
  private static void initBlocksArea(String formName) {
    OdeLog.log("BlocklyPanel: Got initBlocksArea call for " + formName);

    // if there are any components added, add them first before we load
    // block content that might reference them

    Map<String, ComponentOp> savedComponents = currentComponents.get(formName);
    if (savedComponents != null) { // shouldn't be!
      OdeLog.log("Restoring " + savedComponents.size() +
          " previous blockly components for form " + formName);
      for (ComponentOp op : savedComponents.values()) {
        doAddComponent(formName, op.typeDescription, op.instanceName, op.uid);
      }
    }

    if (componentOps.containsKey(formName)) {
      OdeLog.log("Replaying " + componentOps.get(formName).size() + " ops waiting in queue");
      for (ComponentOp op: componentOps.get(formName)) {
        switch (op.op){
          case ADD:
            doAddComponent(formName, op.typeDescription, op.instanceName, op.uid);
            addSavedComponent(formName, op.typeDescription, op.instanceName, op.uid);
            break;
          case REMOVE:
            doRemoveComponent(formName, op.typeName, op.instanceName, op.uid);
            removeSavedComponent(formName, op.typeName, op.instanceName, op.uid);
            break;
          case RENAME:
            doRenameComponent(formName, op.typeName, op.oldName, op.instanceName, op.uid);
            renameSavedComponent(formName, op.typeName, op.oldName, op.instanceName, op.uid);
            break;
        }
      }
      componentOps.remove(formName);
    }

    // If we've gotten any block content to load, load it now
    // Note: Map.remove() returns the value (null if not present), as well as removing the mapping
    String pendingBlocksContent = pendingBlocksContentMap.remove(formName);
    if (pendingBlocksContent != null) {
      OdeLog.log("Loading blocks area content for " + formName);
      loadBlocksContentNow(formName, pendingBlocksContent);
    }
  }

  private static void blocklyWorkspaceChanged(String formName) {
    LoadStatus loadStat = loadStatusMap.get(formName);
    // ignore workspaceChanged events until after the load finishes.
    if (loadStat == null || !loadStat.complete) {
      return;
    }
    if (loadStat.error) {
      ErrorReporter.reportError(MESSAGES.blocksNotSaved(formName));
    } else {
      YaBlocksEditor.onBlocksAreaChanged(formName);
    }
  }

  // Returns true if the blocks for formName have been initialized (i.e.,
  // no componentOps entry exists for formName).
  private static boolean blocksInited(String formName) {
    return !componentOps.containsKey(formName);
  }

  /**
   * Add a component to the blocks workspace
   * @param typeDescription JSON string describing the component type,
   *   formatted as described in
   *   {@link com.google.appinventor.components.scripts.ComponentDescriptorGenerator}
   * @param instanceName the name of the component instance
   * @param uid  the unique id of the component instance
   */
  public void addComponent(String typeDescription, String instanceName, String uid) {
    if (!blocksInited(formName)) {
      ComponentOp cop = new ComponentOp();
      cop.op = OpType.ADD;
      cop.instanceName = instanceName;
      cop.typeDescription = typeDescription;
      cop.uid = uid;
      if (!componentOps.containsKey(formName)) {
        componentOps.put(formName,  new ArrayList<ComponentOp>());
      }
      componentOps.get(formName).add(cop);
    } else {
      doAddComponent(formName, typeDescription, instanceName, uid);
      addSavedComponent(formName, typeDescription, instanceName, uid);
    }
  }

  private static void addSavedComponent(String formName, String typeDescription,
      String instanceName, String uid) {
    Map<String, ComponentOp> myComponents = currentComponents.get(formName);
    if (!myComponents.containsKey(uid)) {
      // we expect there to be no saved component with this uid yet!
      ComponentOp savedComponent = new ComponentOp();
      savedComponent.op = OpType.ADD;
      savedComponent.instanceName = instanceName;
      savedComponent.typeDescription = typeDescription;
      savedComponent.uid = uid;
      myComponents.put(uid, savedComponent);
    } else {
      OdeLog.wlog("BlocklyPanel: already have component with uid " + uid
          + ", instanceName is " + myComponents.get(uid).instanceName);
    }

  }

  /**
   * Remove the component instance instanceName, with the given typeName
   * and uid from the workspace.
   * @param typeName component type name (e.g., "Canvas" or "Button")
   * @param instanceName  instance name
   * @param uid  unique id
   */
  public void removeComponent(String typeName, String instanceName, String uid) {
    if (!blocksInited(formName)) {
      ComponentOp cop = new ComponentOp();
      cop.op = OpType.REMOVE;
      cop.instanceName = instanceName;
      cop.typeName = typeName;
      cop.uid = uid;
      if (!componentOps.containsKey(formName)) {
        componentOps.put(formName,  new ArrayList<ComponentOp>());
      }
      componentOps.get(formName).add(cop);
    } else {
      doRemoveComponent(formName, typeName, instanceName, uid);
      removeSavedComponent(formName, typeName, instanceName, uid);
    }
  }

  private static void removeSavedComponent(String formName, String typeName,
      String instanceName, String uid) {
    Map<String, ComponentOp> myComponents = currentComponents.get(formName);
    if (myComponents.containsKey(uid)
        && myComponents.get(uid).instanceName.equals(instanceName)) {
      // we expect it to be there
      myComponents.remove(uid);
    } else {
      OdeLog.wlog("BlocklyPanel: can't find saved component with uid " + uid
          + " and name " + instanceName);
    }
  }

  /**
   * Rename the component whose old name is oldName (and whose
   * unique id is uid and type name is typeName) to newName.
   * @param typeName  component type name (e.g., "Canvas" or "Button")
   * @param oldName  old instance name
   * @param newName  new instance name
   * @param uid  unique id
   */
  public void renameComponent(String typeName, String oldName,
      String newName, String uid) {
    if (!blocksInited(formName)) {
      ComponentOp cop = new ComponentOp();
      cop.op = OpType.RENAME;
      cop.instanceName = newName;
      cop.oldName = oldName;
      cop.typeName = typeName;
      cop.uid = uid;
      if (!componentOps.containsKey(formName)) {
        componentOps.put(formName,  new ArrayList<ComponentOp>());
      }
      componentOps.get(formName).add(cop);
    } else {
      doRenameComponent(formName, typeName, oldName, newName, uid);
      renameSavedComponent(formName, typeName, oldName, newName, uid);
    }
  }

  private static void renameSavedComponent(String formName, String typeName,
      String oldName, String newName, String uid) {
    Map<String, ComponentOp> myComponents = currentComponents.get(formName);
    if (myComponents.containsKey(uid)) {
      // we expect it to be there
      ComponentOp savedComponent = myComponents.get(uid);
      if (savedComponent.instanceName.equals(oldName)) {  // it should!
        savedComponent.instanceName = newName;  // rename saved component
      } else {
        OdeLog.wlog("BlocklyPanel: saved component with uid " + uid +
            " has name " + savedComponent.instanceName + ", expected " + oldName);
      }
    } else {
      OdeLog.wlog("BlocklyPanel: can't find saved component with uid " + uid +
          " and name " + oldName);
    }
  }

  /**
   * Show the drawer for component with the specified instance name
   * @param name
   */
  public void showComponentBlocks(String name) {
    if (blocksInited(formName)) {
      doShowComponentBlocks(formName, name);
    }
  }

  /**
   * Hide the component blocks drawer
   */
  public void hideComponentBlocks() {
    if (blocksInited(formName)) {
      doHideComponentBlocks(formName);
    }
  }

  /**
   * Show the built-in blocks drawer with the specified name
   * @param drawerName
   */
  public void showBuiltinBlocks(String drawerName) {
    try {
      if (blocksInited(formName)) {
        doShowBuiltinBlocks(formName, drawerName);
      }
    } catch (JavaScriptException e) {
      ErrorReporter.reportInfo("Not yet implemented: " + drawerName);
    }
  }

  /**
   * Hide the built-in blocks drawer
   */
  public void hideBuiltinBlocks() {
    if (blocksInited(formName)) {
      doHideBlocks(formName);
    }
  }

  /**
   * Show the generic blocks drawer with the specified name
   * @param drawerName
   */
  public void showGenericBlocks(String drawerName) {
    if (blocksInited(formName)) {
      doShowGenericBlocks(formName, drawerName);
    }
  }

  /**
   * Hide the generic blocks drawer
   */
  public void hideGenericBlocks() {
    if (blocksInited(formName)) {
      doHideBlocks(formName);
    }
  }

  /**
   * Remember any component instances for this form in case
   * the workspace gets reinitialized later (we get detached from
   * our parent object and then our blocks editor gets loaded
   * again later). Also, remember the current state of the blocks
   * area in case we get reloaded.
   */
  public void saveComponentsAndBlocks() {
    // Actually, we already have the components saved, but take this as an
    // indication that we are going to reinit the blocks editor the next
    // time it is shown.
    OdeLog.log("BlocklyEditor: prepared for reinit for form " + formName);
    // Get blocks content before putting anything in the componentOps map since an entry in
    // the componentOps map is taken as an indication that the blocks area has not initialized yet.
    pendingBlocksContentMap.put(formName, getBlocksContent());
    componentOps.put(formName, new ArrayList<ComponentOp>());
  }

  /**
   * @returns true if the blocks drawer is showing, false otherwise.
   */
  public boolean drawerShowing() {
    if (blocksInited(formName)) {
      return doDrawerShowing(formName);
    } else {
      return false;
    }
  }

  /**
   * Load the blocks described by blocksContent into the blocks workspace.
   *
   * @param blocksContent  XML description of a blocks workspace in format expected by Blockly
   */
  public void loadBlocksContent(String blocksContent) {
    LoadStatus loadStat = new LoadStatus();
    loadStatusMap.put(formName, loadStat);
    if (blocksInited(formName)) {
      OdeLog.log("Loading blocks content for " + formName);
      loadBlocksContentNow(formName, blocksContent);
    } else {
      // save it to load when the blocks area is initialized
      OdeLog.log("Caching blocks content for " + formName + " for loading when blocks area inited");
      pendingBlocksContentMap.put(formName, blocksContent);
    }
  }

  public static void loadBlocksContentNow(String formName, String blocksContent) {
    LoadStatus loadStat = loadStatusMap.get(formName);  // should not be null!
    try {
      doLoadBlocksContent(formName, blocksContent);
    } catch (JavaScriptException e) {
      ErrorReporter.reportError(MESSAGES.blocksLoadFailure(formName));
      OdeLog.elog("Error loading blocks for screen " + formName + ": "
          + e.getDescription());
      loadStat.error = true;
    }
    loadStat.complete = true;
  }

  /**
   * Return the XML string describing the current state of the blocks workspace
   */
  public String getBlocksContent() {
    if (blocksInited(formName)) {
      return doGetBlocksContent(formName);
    } else {
      // in case someone clicks Save before the blocks area is inited
      String blocksContent = pendingBlocksContentMap.get(formName);
      return (blocksContent != null) ? blocksContent : "";
    }
  }

  /**
   * Get Yail code for current blocks workspace
   *
   * @return the yail code as a String
   * @throws YailGenerationException if there was a problem generating the Yail
   */
  public String getYail(String formJson, String packageName) throws YailGenerationException {
    if (!blocksInited(formName)) {
      throw new YailGenerationException("Blocks area is not initialized yet", formName);
    }
    try {
      return doGetYail(formName, formJson, packageName);
    } catch (JavaScriptException e) {
      throw new YailGenerationException(e.getDescription(), formName);
    }
  }

  /**
   * Generate Yail for the current project and stash it for
   * sending to the REPL.
   *
   * @throws YailGenerationException if there was a problem generating the Yail
   */
  public void sendYail(String formJson, String packageName) throws YailGenerationException {
    if (!blocksInited(formName)) {
      throw new YailGenerationException("Blocks area is not initialized yet", formName);
    }
    try {
      if (timer == null) {      // If we don't have the timer running, start it now
        final String sendYailFormName = formName;
        timer = new Timer() {
            public void run() {
              doPollYail(sendYailFormName);
            }
          };
        timer.scheduleRepeating(2000); // Run every two seconds
      }
      doSendYail(formName, doGetYailRepl(formName, formJson, packageName));
    } catch (JavaScriptException e) {
      throw new YailGenerationException(e.getDescription(), formName);
    }
  }

  public void startRepl(Boolean alreadyRunning) { // Start the Repl
    doStartRepl(formName, alreadyRunning);
  }

  // ------------ Native methods ------------

  private static native void exportMethodsToJavascript() /*-{
    $wnd.BlocklyPanel_initBlocksArea =
      $entry(@com.google.appinventor.client.editor.youngandroid.BlocklyPanel::initBlocksArea(Ljava/lang/String;));
    $wnd.BlocklyPanel_blocklyWorkspaceChanged =
      $entry(@com.google.appinventor.client.editor.youngandroid.BlocklyPanel::blocklyWorkspaceChanged(Ljava/lang/String;));
    // Note: above lines are longer than 100 chars but I'm not sure whether they can be split
  }-*/;

  private native void initJS() /*-{
    $wnd.myBlocklyPanel = this;
    $wnd.Blockly = null;  // will be set to our iframe's Blockly object when
                          // the iframe finishes loading
  }-*/;

  private static native void doAddComponent(String formName, String typeDescription,
      String instanceName, String uid) /*-{
    $wnd.Blocklies[formName].Component.add(typeDescription, instanceName, uid);
  }-*/;

  private static native void doRemoveComponent(String formName, String typeName,
      String instanceName, String uid) /*-{
    $wnd.Blocklies[formName].Component.remove(typeName, instanceName, uid);
  }-*/;

  private static native void doRenameComponent(String formName, String typeName, String oldName,
      String newName, String uid) /*-{
    $wnd.Blocklies[formName].Component.rename(oldName, newName, uid)
  }-*/;

  private static native void doShowComponentBlocks(String formName, String name) /*-{
    $wnd.Blocklies[formName].Drawer.showComponent(name);
  }-*/;

  public static native void doHideComponentBlocks(String formName) /*-{
    $wnd.Blocklies[formName].Drawer.hide();
  }-*/;

  private static native void doShowBuiltinBlocks(String formName, String drawerName) /*-{
    var myBlockly = $wnd.Blocklies[formName];
    myBlockly.Drawer.hide();
    myBlockly.Drawer.showBuiltin(drawerName);
  }-*/;

  public static native void doHideBlocks(String formName) /*-{
    $wnd.Blocklies[formName].Drawer.hide();
  }-*/;

  private static native void doShowGenericBlocks(String formName, String drawerName) /*-{
    var myBlockly = $wnd.Blocklies[formName];
    myBlockly.Drawer.hide();
    myBlockly.Drawer.showGeneric(drawerName);
  }-*/;

  public static native boolean doDrawerShowing(String formName) /*-{
    return $wnd.Blocklies[formName].Drawer.isShowing();
  }-*/;

  public static native void doLoadBlocksContent(String formName, String blocksContent) /*-{
    $wnd.Blocklies[formName].SaveFile.load(blocksContent);
  }-*/;

  public static native String doGetBlocksContent(String formName) /*-{
    return $wnd.Blocklies[formName].SaveFile.get();
  }-*/;

  public static native String doGetYailRepl(String formName, String formJson, String packageName) /*-{
    return $wnd.Blocklies[formName].Yail.getFormYail(formJson, packageName, true);
  }-*/;

  public static native String doGetYail(String formName, String formJson, String packageName) /*-{
    return $wnd.Blocklies[formName].Yail.getFormYail(formJson, packageName);
  }-*/;

  public static native void doSendYail(String formName, String Yail) /*-{
    $wnd.Blocklies[formName].ReplMgr.sendYail(Yail);
  }-*/;

  public static native void doPollYail(String formName) /*-{
    $wnd.Blocklies[formName].ReplMgr.pollYail();
  }-*/;

  public static native void doStartRepl(String formName, Boolean alreadyRunning) /*-{
    $wnd.Blocklies[formName].ReplMgr.startRepl(alreadyRunning);
    }-*/;

}
