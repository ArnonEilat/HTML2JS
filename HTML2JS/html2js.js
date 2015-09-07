/**
 * @description Convert HTML to javascript code
 * @constructor
 */
var Html2js = function() {
  var NODE_TYPE = {
    //See: https://developer.mozilla.org/en/docs/Web/API/Node/nodeType#Constants
    TEXT_NODE: 3
  };

  var finalResult = '';
  var namer;
  var q = '\'';

  /***
   * @description Convert htmlString to equivalent javaScript code.
   * @param htmlString {string}
   * @param rootElement {string}
   * @param namesType {string} Can be: 'byElementClue' Or 'haiku'
   * @return {string}
   */
  this.convert = function(htmlString, rootElement, namesType) {
    finalResult = '';
    namer = new Namer();
    namer.setNamesType(namesType);

    mapDOM(htmlString, rootElement);
    return finalResult;
  }

  /**
   * @param {string} elementStr
   * @param {string} rootElement
   * @private
   */
  function mapDOM(elementStr, rootElement) {
    var treeObject = {};
    var docNode;
    if (typeof rootElement !== 'string' || rootElement.length < 1)
      rootElement = 'document.body';

    if (typeof elementStr === 'string') { // If string convert to document Node
      var parser = new DOMParser();
      elementStr = elementStr.trim();
      docNode = parser.parseFromString(elementStr, 'text/html');
      docNode.normalize(); // Clean up all the text nodes under this element (merge adjacent, remove empty).
    } else
      throw 'invalid argument supply';

    for (var i = 0; i < docNode.body.childNodes.length; i++) {
      treeHTML(docNode.body.childNodes[i], rootElement);
    }
  }


  /**
   * @description Append Attributes to element. work on/modify the global finalResult
   * @param element {HTMLElement}
   * @param name {string}
   * @private
   */
  function appendAttributes(element, name) {
    for (var i = 0; i < element.attributes.length; i++) {
      var attribute = element.attributes[i].nodeName;

      if (attribute.search('^data-') !== -1) {
        var attributeName = attribute.substring(5);
        var value = element.attributes[i].value;
        if (isNaN(value) || value === 'true' || value === 'false')
          value = q + value + q;

        finalResult += name + '.dataset.' + attributeName + ' = ' + value + ';\n';
        continue;
      } else if (attribute.search('^on') !== -1) {
        finalResult += name + '.' + element.attributes[i].nodeName + ' = function(evt) {\n\t' + element.attributes[i].value + ';\n};\n';
        continue;
      }

      switch (attribute) {
        case 'class':
          var list = element.classList;
          for (var j = 0; j < list.length; j++) {
            finalResult += name + '.classList.add(' + q + list[j] + q + ');\n';
          }
          break;
        case 'style':
          var list = element.style.cssText.split(';');
          for (var j = 0; j < list.length; j++) {
            if (list[j] !== '') {
              var splitIdx = list[j].indexOf(':');
              var styleAttr = list[j].substring(0, splitIdx).trim();
              var stylevalue = list[j].substring(splitIdx + 1, list[j].length).trim();
              finalResult += name + '.style.' + styleAttr.camelize() + ' = ' + q + stylevalue.camelize() + q + ';\n';
            }
          }
          break;
        default:
          var nodeValue = element.attributes[i].nodeValue;
          if (nodeValue.toLowerCase() === 'tabindex')
            nodeValue = 'tabIndex';
          else if (nodeValue.toLowerCase() === 'offsetwidth')
            nodeValue = 'offsetWidth';
          else if (nodeValue.toLowerCase() === 'offsetheight')
            nodeValue = 'offsetHeight';
          else if (nodeValue.toLowerCase() === 'offsetleft')
            nodeValue = 'offsetLeft';
          else if (nodeValue.toLowerCase() === 'offsetparent')
            nodeValue = 'offsetParent';
          else if (nodeValue.toLowerCase() === 'offsettop')
            nodeValue = 'offsetTop';
          else if (nodeValue.toLowerCase() === 'iscontenteditable')
            nodeValue = 'isContentEditable';
          else if (nodeValue.toLowerCase() === 'contenteditable')
            nodeValue = 'contentEditable';
          else if (nodeValue.toLowerCase() === 'accesskey')
            nodeValue = 'accessKey';

          finalResult += name + '.' + element.attributes[i].nodeName + ' = ' + q + nodeValue + q + ';\n';
      }
    }

  }

  /**
   * @description Add  quote to text.
   * @param text {string}
   * @return {string}
   */
  function quotesText(text) {
    var re = new RegExp(q, 'g');
    var textArr = text.trim().split('\n');
    for (var i = 0; i < textArr.length; i++) {
      textArr[i] = textArr[i].replace(re, '\\' + q);
      textArr[i] = q + textArr[i].trim() + q;
    }
    return textArr.join('\n+ ');
  }


  /**
   * @description Recursively loop through DOM elements and assign properties to object
   * @param element {HTMLElement}
   * @param parentName {string}
   */
  function treeHTML(element, parentName) {
    var nodeList = element.childNodes;
    var myName = namer.getName(element);

    if (element.nodeType === NODE_TYPE.TEXT_NODE && element.nodeValue.trim() !== '') {
      finalResult += parentName + '.appendChild(document.createTextNode(' + quotesText(element.nodeValue.trim()) + '));\n';
    } else {
      finalResult += 'var ' + myName + ' = document.createElement(' + q + element.nodeName + q + ');\n';

      if (typeof element.attributes !== 'undefined') {
        if (element.attributes.length)
          appendAttributes(element, myName);
      }
      finalResult += parentName + '.appendChild(' + myName + ');\n';
    }

    if (nodeList !== null && nodeList.length) {
      if (nodeList.length === 1 && nodeList[0].nodeType === NODE_TYPE.TEXT_NODE) {
        finalResult += myName + '.textContent = ' + quotesText(nodeList[0].nodeValue) + ';\n';
      } else {
        for (var i = 0; i < nodeList.length; i++) {
          if (nodeList[i].nodeType === NODE_TYPE.TEXT_NODE && nodeList[i].nodeValue.trim() !== '') {
            finalResult += myName + '.appendChild(document.createTextNode(' + quotesText(nodeList[i].nodeValue.trim()) + '));\n';
          } else if (nodeList[i].nodeType === NODE_TYPE.TEXT_NODE) {
            // nothing to do
          } else {
            treeHTML(nodeList[i], myName);
          }
        }
      }
    }
  }
}
