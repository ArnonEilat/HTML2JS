'use strict';
var convertBtn = document.getElementById('convertBtn');
var variablesName = document.getElementById('variables-name');
var rootElement = document.getElementById('rootElement');
var HTMLInput = document.getElementById('HTMLInput');
var jsOutput = document.getElementById('jsOutput');




var HTMLInputCM = CodeMirror.fromTextArea(HTMLInput, {
  lineNumbers: true,
  lineWrapping: true,
  indentUnit: 4,
  indentWithTabs: true,
  styleActiveLine: true,
  mode: "application/x-ejs",
  theme: "mbo",
  gutters: ["CodeMirror-linenumbers"]
});

var jsOutputCM = CodeMirror.fromTextArea(jsOutput, {
  lineNumbers: true,
  lineWrapping: true,
  indentUnit: 4,
  styleActiveLine: true,
  mode: "javascript",
  theme: "mbo",
  gutters: ["CodeMirror-linenumbers"]
});

convertBtn.addEventListener('click', function(e) {
  var html2js = new Html2js();
  var htmlStr = HTMLInputCM.getValue();
  var res = html2js.convert(htmlStr, rootElement.value, variablesName.value);
  jsOutputCM.setValue(res);
});
