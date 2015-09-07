/***
 * @description Transform this string to camel case.
 * @see Modified slightly from https://github.com/epeli/underscore.string
 * @return string
 **/
String.prototype.camelize = function() {
  return this.trim().replace(/(\-|_|\s)+(.)?/g, function(mathc, sep, c) {
    return (c ? c.toUpperCase() : '');
  });
};
