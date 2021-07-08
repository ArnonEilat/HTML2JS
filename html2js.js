/**
 * @description Convert HTML to javascript code
 * @constructor
 */
var Html2js = function() {
  var NODE_TYPE = {
    //See: https://developer.mozilla.org/en/docs/Web/API/Node/nodeType#Constants
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
    COMMENT_NODE: 8
  };

  var finalResult = '';
  var namer;
  var q = '\'';
  var usedNames = {};

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
      rootElement = 'fragment';

    if (typeof elementStr === 'string') { // If string convert to document Node
      var parser = new DOMParser();
      elementStr = elementStr.trim();
      docNode = parser.parseFromString(elementStr, 'text/html');
      docNode.normalize(); // Clean up all the text nodes under this element (merge adjacent, remove empty).
    } else
      throw 'invalid argument supply';

    for (var i = 0; i < docNode.documentElement.childNodes.length; i++) {
      treeHTML(docNode.documentElement.childNodes[i], rootElement);
    }
  }


  /**
   * @description Append Attributes to element. work on/modify the global finalResult
   * @param element {HTMLElement}
   * @param name {string}
   * @param maybeLValue {bool} last statment is hanging open
   * for elemObj##\n\n\n##.prop="XYZ"; buffer line add on
   * @private
   */
  function appendAttributes(element, name, maybeLValue) {
    var getName = function() {
      if(maybeLValue) {
        maybeLValue = false;
        return '';
      } else {
        return name;
      }
    };
    for (var i = 0; i < element.attributes.length; i++) {
      var attribute = element.attributes[i].nodeName;

      if (attribute.search('^data-') !== -1) {
        var attributeName = attribute.substring(5)
          .replace(/-([a-z])/g, (match, alpha) => alpha.toUpperCase());
        var value = element.attributes[i].value;
        var attr = element.attributes[i];
        //if string or book wrap quotes
        if (isNaN(value) || value === 'true' || value === 'false' || value === '')
          value = quotesText(value);

        finalResult += getName() + '.dataset.' + attributeName + ' = ' + value + ';\n';
        continue;
      } else if (attribute.search('^on') !== -1) {
        finalResult += getName() + '.' + element.attributes[i].nodeName + ' = function(evt) {\n\t' + quotesText(element.attributes[i].value) + ';\n};\n';
        continue;
      }

      switch (attribute) {
        case 'class':
          var list = element.classList;
          for (var j = 0; j < list.length; j++) {
            finalResult += getName() + '.classList.add(' + q + list[j] + q + ');\n';
          }
          break;
        case 'style':
          var list = element.style.cssText.split(';');
          for (var j = 0; j < list.length; j++) {
            if (list[j] !== '') {
              var splitIdx = list[j].indexOf(':');
              var styleAttr = list[j].substring(0, splitIdx).trim();
              var stylevalue = list[j].substring(splitIdx + 1, list[j].length).trim();
              finalResult += getName() + '.style.' + styleAttr.camelize() + ' = ' + q + stylevalue.camelize() + q + ';\n';
            }
          }
          break;
        default:
          var nodeName = element.attributes[i].nodeName;
          if (nodeName.toLowerCase() === 'tabindex')
            nodeName = 'tabIndex';
          else if (nodeName.toLowerCase() === 'offsetwidth')
            nodeName = 'offsetWidth';
          else if (nodeName.toLowerCase() === 'offsetheight')
            nodeName = 'offsetHeight';
          else if (nodeName.toLowerCase() === 'offsetleft')
            nodeName = 'offsetLeft';
          else if (nodeName.toLowerCase() === 'offsetparent')
            nodeName = 'offsetParent';
          else if (nodeName.toLowerCase() === 'offsettop')
            nodeName = 'offsetTop';
          else if (nodeName.toLowerCase() === 'iscontenteditable')
            nodeName = 'isContentEditable';
          else if (nodeName.toLowerCase() === 'contenteditable')
            nodeName = 'contentEditable';
          else if (nodeName.toLowerCase() === 'accesskey')
            nodeName = 'accessKey';
        //convert things like http-equiv to httpEquiv
         nodeName = nodeName.toLowerCase().replace(/-\w/g, function(t){return t.substr(1).toUpperCase()});

          finalResult += getName() + '.' + nodeName + ' = ' + quotesText(element.attributes[i].nodeValue) + ';\n';
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
      /* use JSON.stringify ? */
      textArr[i] = textArr[i].replace(/\\/g,'\\\\').replace(re, '\\' + q);
/*    a // comment in a script element without a newline causes
      a user agent syntax or fatal exception, new lines must stay
      the original HTML can be minified to remove JS comments before
      this lib is used */
      textArr[i] = q + textArr[i].trim() + (textArr.length == 1 ? '' : '\\n') + q;
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
/*    Only a node that turns into a textContent can be lvalue
      prop assigned, comments and child elements are complicated,
      child elements are not lvalue assignable because
      its impossible to know at this point if rval of appendChild(createElement(())
      has a func identifier to be saved to

      appendChild(var nodeName3 = createElement('div')).class='abc',
      nodeName3.textContent = 'xyz'

      is illegal its too much work to separate

      appendChild(var nodeName3 = createElement('div')).class='abc',
      nodeName3.textContent = 'xyz'

      appendChild(nodeName3 = createElement('div')).class='abc', nodeName3.textContent = 'xyz'

      var nodeName2, nodeName3; someNode.appendChild(nodeName3 =
      createElement('div')).class='abc', nodeName3.textContent = 'xyz'

      since it would require 2 passes of code gen to generate the var decl list
*/
    var assignElem = (nodeList !== null && nodeList.length > 0
      && (nodeList.length * (nodeList[0].nodeType == NODE_TYPE.TEXT_NODE ? 1 : 2)))|0;
    var assignAttr = (typeof element.attributes !== 'undefined' && element.attributes.length)|0;
    var assignStyle = (assignAttr && element.attributes[0].nodeName === 'style' ? 2 : 0);
    var assignClass = (assignAttr && element.attributes[0].nodeName === 'class' ? 2 : 0);

    var assignments = assignElem + assignAttr + assignStyle + assignClass;

    var need_var = assignments == 0 || assignments == 1 ? false : true;
    if (need_var) {
      var myName = namer.getName(element);
      var varPrefixDecl = usedNames[myName] ? '' : 'var ';
      usedNames[myName] = true;
    }
    var maybeLValue = !varPrefixDecl;
    var getName = function() {
      if (maybeLValue) {
        maybeLValue = false;
        return '';
      } else {
        return myName;
      }
    };

    if (element.nodeType === NODE_TYPE.TEXT_NODE && element.nodeValue.trim() !== '') {
      finalResult += parentName + '.appendChild(document.createTextNode(' + quotesText(element.nodeValue.trim()) + '));\n';
    } else if (element.nodeType === NODE_TYPE.ELEMENT_NODE) {
      finalResult += (need_var ? (varPrefixDecl || '(') + myName + ' = ' : '')
        + parentName + '.appendChild(document.createElement(' + q + element.nodeName + q
        + (varPrefixDecl ? '));' : need_var ? ')))' : '))');

      if (typeof element.attributes !== 'undefined') {
        if (element.attributes.length) {
          appendAttributes(element, myName, maybeLValue);
          maybeLValue = false;
        }
      }

      if (nodeList !== null && nodeList.length) {
        if (nodeList.length === 1 && nodeList[0].nodeType === NODE_TYPE.TEXT_NODE) {
          finalResult += getName() + '.textContent = ' + quotesText(nodeList[0].nodeValue) + ';\n';
        } else {
          for (var i = 0; i < nodeList.length; i++) {
            if (nodeList[i].nodeType === NODE_TYPE.TEXT_NODE && nodeList[i].nodeValue.trim() !== '') {
              finalResult += getName() + '.appendChild(document.createTextNode(' + quotesText(nodeList[i].nodeValue.trim()) + '));\n';
            } else if (nodeList[i].nodeType === NODE_TYPE.TEXT_NODE
              || nodeList[i].nodeType === NODE_TYPE.COMMENT_NODE) {
              if (maybeLValue) { //lvalue never consumed
                finalResult += ';\n';
                maybeLValue = false;
              }
              // nothing to do
            } else {
              if (maybeLValue) { //lvalue never consumed
                finalResult += ';\n';
                maybeLValue = false;
              }
              treeHTML(nodeList[i], myName);
            }
          }
        }
      }
      if(maybeLValue) { //lvalue never consumed
        finalResult += ';\n';
      }
    }
    myName && namer.purgeName(myName);
  }
}
