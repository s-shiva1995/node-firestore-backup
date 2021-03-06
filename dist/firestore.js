'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.backupRootCollections = exports.backupCollection = exports.backupDocument = exports.constructDocumentValue = exports.constructReferenceUrl = undefined;

var _types = require('./types');

var _utility = require('./utility');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var constructReferenceUrl = exports.constructReferenceUrl = function constructReferenceUrl(reference) {
  var referencePath = '';
  Object.keys(reference).forEach(function (key) {
    Object.keys(reference[key]).forEach(function (subKey) {
      if (subKey === 'segments') {
        var pathArray = reference[key][subKey];
        pathArray.forEach(function (pathKey) {
          referencePath = referencePath ? referencePath + '/' + pathKey : pathKey;
        });
      }
    });
  });
  return referencePath ? { value: referencePath, type: 'reference' } : { value: reference, type: 'unknown' };
};

var constructDocumentValue = exports.constructDocumentValue = function constructDocumentValue() {
  var documentDataToStore = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var keys = arguments[1];
  var documentData = arguments[2];

  keys.forEach(function (key) {
    // Boolean - boolean
    // Reference - reference
    // Integer - number
    // Array - array
    // Object - object
    // Float - number
    // Geographical Point - todo
    // Map = todo
    // Null - null
    // String - string
    if ((0, _types.isBoolean)(documentData[key])) {
      documentDataToStore = Object.assign({}, documentDataToStore, _defineProperty({}, key, (0, _types.isBoolean)(documentData[key])));
    } else if ((0, _types.isDate)(documentData[key])) {
      documentDataToStore = Object.assign({}, documentDataToStore, _defineProperty({}, key, (0, _types.isDate)(documentData[key])));
    } else if ((0, _types.isNumber)(documentData[key])) {
      documentDataToStore = Object.assign({}, documentDataToStore, _defineProperty({}, key, (0, _types.isNumber)(documentData[key])));
    } else if ((0, _types.isArray)(documentData[key])) {
      documentDataToStore[key] = Object.assign({}, documentDataToStore[key], { type: 'array' });
      documentDataToStore[key] = Object.assign({}, documentDataToStore[key], constructDocumentValue({}, Object.keys(documentData[key]), documentData[key]));
    } else if ((0, _types.isObject)(documentData[key])) {
      documentDataToStore[key] = Object.assign({}, documentDataToStore[key], { type: 'object' });
      documentDataToStore[key] = Object.assign({}, documentDataToStore[key], constructDocumentValue({}, Object.keys(documentData[key]), documentData[key]));
    } else if ((0, _types.isNull)(documentData[key])) {
      documentDataToStore = Object.assign({}, documentDataToStore, _defineProperty({}, key, (0, _types.isNull)(documentData[key])));
    } else if ((0, _types.isString)(documentData[key])) {
      documentDataToStore = Object.assign({}, documentDataToStore, _defineProperty({}, key, (0, _types.isString)(documentData[key])));
    } else {
      documentDataToStore = Object.assign({}, documentDataToStore, _defineProperty({}, key, constructReferenceUrl(documentData[key])));
    }
  });
  return documentDataToStore;
};

var backupDocument = exports.backupDocument = function backupDocument(document, backupPath, logPath, prettyPrintJSON) {
  console.log('Backing up Document \'' + logPath + document.id + '\'');
  try {
    _mkdirp2.default.sync(backupPath);
  } catch (error) {
    throw new Error('Unable to create backup path for Document \'' + document.id + '\': ' + error);
  }

  var fileContents = void 0;
  try {
    var documentData = document.data();
    var keys = Object.keys(documentData);
    var documentDataToStore = {};
    documentDataToStore = Object.assign({}, constructDocumentValue(documentDataToStore, keys, documentData));
    if (prettyPrintJSON === true) {
      fileContents = JSON.stringify(documentDataToStore, null, 2);
    } else {
      fileContents = JSON.stringify(documentDataToStore);
    }
  } catch (error) {
    throw new Error('Unable to serialize Document \'' + document.id + '\': ' + error);
  }
  try {
    _fs2.default.writeFileSync(backupPath + '/' + document.id + '.json', fileContents);
  } catch (error) {
    throw new Error('Unable to write Document \'' + document.id + '\': ' + error);
  }

  return document.ref.getCollections().then(function (collections) {
    return (0, _utility.promiseSerial)(collections.map(function (collection) {
      return function () {
        return backupCollection(collection, backupPath + '/' + collection.id, logPath + document.id + '/', prettyPrintJSON);
      };
    }));
  });
};

var backupCollection = exports.backupCollection = function backupCollection(collection, backupPath, logPath, prettyPrintJSON) {
  console.log('Backing up Collection \'' + logPath + collection.id + '\'');
  try {
    _mkdirp2.default.sync(backupPath);
  } catch (error) {
    throw new Error('Unable to create backup path for Collection \'' + collection.id + '\': ' + error);
  }

  return collection.get().then(function (documentSnapshots) {
    var backupFunctions = [];
    documentSnapshots.forEach(function (document) {
      backupFunctions.push(function () {
        return backupDocument(document, backupPath + '/' + document.id, logPath + collection.id + '/', prettyPrintJSON);
      });
    });
    return (0, _utility.promiseSerial)(backupFunctions);
  });
};

var backupRootCollections = exports.backupRootCollections = function backupRootCollections(database, backupPath, prettyPrintJSON) {
  return database.getCollections().then(function (collections) {
    return (0, _utility.promiseSerial)(collections.map(function (collection) {
      return function () {
        return backupCollection(collection, backupPath + '/' + collection.id, '/', prettyPrintJSON);
      };
    }));
  });
};