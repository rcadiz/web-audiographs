/**
 * @OnlyCurrentDoc
 *
 */

/**
 * Creates a menu entry in the Google Sheets UI when the sheet is opened.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @param {object} e The event parameter for a simple onOpen trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode.
 */
function onOpen(e) {
  SpreadsheetApp.getUi().createAddonMenu()
      .addItem('Open panel and play', 'showControlPanel')
      .addToUi();
}

/**
 * Runs when the add-on is installed.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @param {object} e The event parameter for a simple onInstall trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode. (In practice, onInstall triggers always
 *     run in AuthMode.FULL, but onOpen triggers may be AuthMode.LIMITED or
 *     AuthMode.NONE.)
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Opens a sidebar in the sheet containing the add-on's user interface.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 */
function showControlPanel() {
  var ui = HtmlService.createHtmlOutputFromFile('control')
      .setTitle('Audiographs');
  SpreadsheetApp.getUi().showSidebar(ui);
}

/**
 * Gets the user-selected series data.
 *
 * @return {Object} Data series to sonify.
 */
function getData() {
  var data = SpreadsheetApp.getActiveRange().getValues();
  if (Array.isArray(data)) {
    var series1 = [];
    var series2 = [];
    var output = [];
    for(var i = 0; i < data.length; i++) {
      series1.push(data[i][0]);
      if (data[i].lenght > 1) {
        series2.push(data[i][1]);
      }
    }
    if (series1.length > 0) {
      output.push(series1);
      if (series2.length > 0) {
        output.push(series2);
      }
    }
    return output;
  }
  return [];
}
