"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// TODO insertOrUpdate method

var File = function () {
	function File(fileName, client) {
		_classCallCheck(this, File);

		this.fileName = fileName;
		this.syncing = false;
		this.syncingAddedData = null;
		this.timeExtension = 0;
		this.timeLastRead = 0;
		this.fileStats = null;
		this.dataObject = {};
		this.client = client;
	}

	_createClass(File, [{
		key: "query",
		value: function query(param) {
			return this.toDataArray(this.queryHelper(param));
		}
	}, {
		key: "queryHelper",
		value: function queryHelper(param) {
			if (typeof param === "function") {
				return this.queryByFunction(param);
			} else if (param == null) {
				return this.dataObject;
			} else {
				return this.queryByValue(param);
			}
		}
	}, {
		key: "remove",
		value: function remove(param) {
			var key, result;
			this.scheduleSync();
			result = this.queryHelper(param);
			for (key in result) {
				if (!result.hasOwnProperty(key)) continue;
				delete this.dataObject[key];
			}

			return this.query(param);
		}
	}, {
		key: "update",
		value: function update(param, values) {
			var field, id, newRow, result, row, updateData;
			result = this.queryHelper(param);

			for (id in result) {
				if (!result.hasOwnProperty(id)) continue;
				row = result[id];
				newRow = this.clone(row);

				for (field in values) {
					if (!values.hasOwnProperty(field)) continue;
					updateData = values[field];
					newRow[field] = updateData;
				}
				this.remove(this.dataObject[id]);
				this.insert(newRow);
			}

			return this.query(param);
		}
	}, {
		key: "updateByFunction",
		value: function updateByFunction(query, updateFunction) {
			var result = this.queryHelper(query);

			console.debug("[File.updateByFunction] affected rows: ", this.toDataArray(result).length);

			for (id in result) {
				if (!result.hasOwnProperty(id)) continue;
				var row = result[id];
				var newRow = updateFunction(this.clone(row));
				this.remove(this.dataObject[id]);
				this.insert(newRow);
			}

			return this.query(query);
		}
	}, {
		key: "insert",
		value: function insert(data) {
			this.scheduleSync();
			var nid = this.getNextId();

			return this.dataObject[nid] = data;
		}
	}, {
		key: "queryByFunction",
		value: function queryByFunction(func) {
			var id, ref, result, row;
			result = {};
			ref = this.dataObject;

			//    console.debug('queryByFunction,  func:', func);

			for (id in ref) {
				if (!ref.hasOwnProperty(id)) continue;
				row = ref[id];
				if (func(this.clone(row)) === true) {
					result[id] = this.clone(row);
				}
			}

			return result;
		}
	}, {
		key: "queryByValue",
		value: function queryByValue(params) {
			var field, found, id, ref, result, row;
			result = {};
			ref = this.dataObject;

			//    console.debug('queryByValue,  params:', params);

			for (id in ref) {
				if (!ref.hasOwnProperty(id)) continue;
				row = ref[id];
				found = null;

				for (field in params) {
					if (!params.hasOwnProperty(field)) continue;
					if (row[field] === params[field]) {
						if (found === null) {
							// first call, set found to true;
							found = true;
						} else {
							// since all conditions must be true,
							// chain with previously found conditions
							// for this row
							found = found && true;
						}
					} else {
						found = false;
					}
				}

				if (!!found) {
					result[id] = this.clone(row);
				}
			}

			return result;
		}
	}, {
		key: "getNextId",
		value: function getNextId() {
			var increment, time;
			time = new Date().getTime();
			this.timeExtension++;
			increment = this.timeExtension % 1000;
			if (increment < 10) {
				return time + "00" + increment;
			} else if (increment < 100) {
				return time + "0" + increment;
			} else {
				return "" + time + increment;
			}
		}
	}, {
		key: "scheduleSync",
		value: function scheduleSync() {
			var _this = this;

			if (!this.syncing) {
				this.syncing = true;
				return setTimeout(function () {
					_this.sync();
				}, 0);
			}
		}
	}, {
		key: "sync",
		value: function sync() {
			var _this2 = this;

			console.debug("[File.sync] start sync", "fileStats:", this.fileStats);
			var oldVersionTag, time, promise;
			this.syncing = false;
			time = new Date().getTime();
			oldVersionTag = "0";

			if (this.fileStats != null) {
				oldVersionTag = this.fileStats.versionTag;
			}

			this.readStat().then(function (value) {
				console.debug("[File.sync] after readStat", oldVersionTag, _this2.fileStats.versionTag);
				if (oldVersionTag !== _this2.fileStats.versionTag) {
					// if there are changes on server side,
					// they need to be merged with local changes
					var oldData = _this2.clone(_this2.dataObject);
					console.debug("[File.sync] version tags do differ");
					_this2.readFile().then(function (data) {
						console.debug("[File.sync] after readFile");
						_this2.dataObject = _this2.merge(oldData, _this2.dataObject);
						_this2.timeLastRead = time;
						_this2.writeFile();
					});
				} else {
					// versions are identical, file can be overridden without loss
					_this2.timeLastRead = time;
					_this2.writeFile();
				}
			});
		}
	}, {
		key: "getVersionTag",
		value: function getVersionTag() {
			return this.fileStats.versionTag;
		}
	}, {
		key: "getSize",
		value: function getSize() {
			var syncingLength;
			syncingLength = 0;
			if (this.syncingAddedData != null) {
				syncingLength = JSON.stringify(this.syncingAddedData).length;
			}

			return JSON.stringify(this.dataObject).length + syncingLength;
		}
	}, {
		key: "getName",
		value: function getName() {
			return this.fileName;
		}
	}, {
		key: "getData",
		value: function getData() {
			return this.clone(this.dataObject);
		}
	}, {
		key: "getDataArray",
		value: function getDataArray() {
			return this.toDataArray(this.dataObject);
		}
	}, {
		key: "toDataArray",
		value: function toDataArray(object) {
			var array, key;
			array = [];
			for (key in object) {
				array.push(object[key]);
			}
			return this.clone(array);
		}

		/**
   * reads file contents into local variable representation.
   * Returns promise to listen on.
   */

	}, {
		key: "readFile",
		value: function readFile() {
			var _this3 = this;

			return new Promise(function (resolve, reject) {
				_this3.client.readFile(_this3.fileName, function (err, data, stats) {
					if (_this3.error(err)) {
						_this3.dataObject = JSON.parse(data);
						_this3.fileStats = stats;
						resolve(_this3.dataObject);
					}
				});
			});
		}

		/**
   * writes local data representation into file.
   * Returns promise to listen on.
   */

	}, {
		key: "writeFile",
		value: function writeFile() {
			var _this4 = this;

			return new Promise(function (resolve, reject) {
				_this4.client.writeFile(_this4.fileName, JSON.stringify(_this4.dataObject), function (err, stats) {
					if (_this4.error(err)) {
						_this4.fileStats = stats;
						resolve(stats);
					}
				});
			});
		}
	}, {
		key: "readStat",
		value: function readStat() {
			var _this5 = this;

			return new Promise(function (resolve, reject) {
				_this5.client.stat(_this5.fileName, function (err, stats) {
					if (_this5.error(err)) {
						console.debug("[readStat] stats:", stats);
						_this5.fileStats = stats;
						resolve(stats);
					}
				});
			});
		}
	}, {
		key: "error",
		value: function error(err) {
			var result;
			result = true;
			if (err != null) {
				switch (err.status) {
					case 404:
						result = false;
						console.log("File not found - creating new file");
						this.writeFile();
						break;
					case 503:
						result = false;
						console.log("Too many requests - try again in 1000ms");
						setTimeout(this.sync, 1000);
						break;
					default:
						console.error(err);
						result = false;
				}
			}

			return result;
		}
	}, {
		key: "merge",
		value: function merge(objA, objB) {
			var key, objMerged, time;
			console.log("MERGING");
			objMerged = {};
			time = 0;

			for (key in objB) {
				if (!objB.hasOwnProperty(key)) continue;

				if (objA[key] != null) {
					objMerged[key] = objB[key];
				}

				if (objA[key] == null) {
					time = parseInt(key.slice(0, 13));

					if (time > this.timeLastRead) {
						objMerged[key] = objA[key];
					}
				}
			}

			return objMerged;
		}

		/**
   * Helper function to create a clone of given object.
   */

	}, {
		key: "clone",
		value: function clone(obj) {
			var str = JSON.stringify(obj);
			return JSON.parse(str);
			// results in NaN and undefined values:
			/*var new_obj = {};
   	for(var key in obj) {
   		if( obj.hasOwnProperty(key) ) {
   			new_obj[key] = obj[key];
   		}
   	}
   	return new_obj;*/
			s;
		}
	}, {
		key: "call",
		value: function call(func) {
			return typeof func === "function" ? func() : void 0;
		}
	}]);

	return File;
}();

var Table = function () {

	/**
  * init Table.
  * @param create If Table is new and shall be created, expects Array of Table fields (not 'true'!)
  */
	function Table(tableName, create, client, promiseResolve, promiseReject) {
		var _this6 = this;

		_classCallCheck(this, Table);

		create = create || false;
		promiseResolve = promiseResolve || false;
		promiseReject = promiseReject || false;
		var file, tableFile;

		this.tableFileData = {};
		this.dataFileObjects = [];
		this.data = [];
		this.client = client;
		this.tableName = tableName; // TODO debug
		tableFile = new File(tableName, client);

		if (create) {
			var promise = tableFile.readFile();
			this.data[0] = {
				maxSize: 62500, // 62500 bytes = 50kB
				dataFiles: []
			};
			// add table fields to table metadata
			if (typeof create === "Array") {
				this.data[0].fields = create;
			}
			file = this.createNewDatafile();
			this.dataFileObjects.push(file);
			this.data[0].dataFiles.push(file.getName());
			tableFile.insert(this.data[0]);
			this.tableFileData = this.data[0];

			promise.then(function (data) {
				if (promiseResolve) {
					promiseResolve(file.getName());
				}
			});
		} else {
			tableFile.readFile().then(function (data) {
				var df, f, results;
				_this6.data = tableFile.getDataArray();
				_this6.tableFileData = _this6.data[0];
				var promises = [];

				var _iteratorNormalCompletion = true;
				var _didIteratorError = false;
				var _iteratorError = undefined;

				try {
					for (var _iterator = _this6.tableFileData.dataFiles[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
						df = _step.value;

						f = new File(df, _this6.client);
						_this6.dataFileObjects.push(f);
						promises.push(f.readFile());
					}
				} catch (err) {
					_didIteratorError = true;
					_iteratorError = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion && _iterator.return) {
							_iterator.return();
						}
					} finally {
						if (_didIteratorError) {
							throw _iteratorError;
						}
					}
				}

				Promise.all(promises).then(function (values) {
					if (promiseResolve) {
						console.debug("[Table.constructor] successfully loaded files for", tableName, values);
						promiseResolve(values);
					}
				}).catch(function (error) {
					console.error("[Table.constructor] error when loading file:", error);
					if (promiseReject) {
						promiseReject(f.getName());
					}
				});
			});
		}
	}

	/**
  * @returns Array with table field names as Strings.
  */


	_createClass(Table, [{
		key: "getTableFields",
		value: function getTableFields() {
			return this.tableFileData.fields;
		}
	}, {
		key: "updateTableData",
		value: function updateTableData() {
			var dataFile, dfo;
			dataFiles = [];

			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = this.dataFileObjects[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					dfo = _step2.value;

					dataFiles.push(dfo.getName());
				}
			} catch (err) {
				_didIteratorError2 = true;
				_iteratorError2 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion2 && _iterator2.return) {
						_iterator2.return();
					}
				} finally {
					if (_didIteratorError2) {
						throw _iteratorError2;
					}
				}
			}

			return tableFile.update(void 0, {
				'dataFiles': dataFiles
			});
		}
	}, {
		key: "insert",
		value: function insert(insertData) {
			var df = this.dataFileObjects[this.dataFileObjects.length - 1];

			if (df.getSize() > this.tableFileData.maxSize) {
				df = createNewDatafile();
				this.dataFileObjects.push(df);
				this.tableFileData.dataFiles.push(df.getName());
				this.updateTableData();
			}

			return df.insert(insertData);
		}
	}, {
		key: "query",
		value: function query(_query, sort, start, limit) {
			var dfo, result, s;
			if (!_query) {
				_query = null;
			}
			if (!sort) {
				sort = null;
			}

			result = [];
			var _iteratorNormalCompletion3 = true;
			var _didIteratorError3 = false;
			var _iteratorError3 = undefined;

			try {
				for (var _iterator3 = this.dataFileObjects[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
					dfo = _step3.value;

					result = result.concat(dfo.query(_query));
				}

				// there are sorting params
			} catch (err) {
				_didIteratorError3 = true;
				_iteratorError3 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion3 && _iterator3.return) {
						_iterator3.return();
					}
				} finally {
					if (_didIteratorError3) {
						throw _iteratorError3;
					}
				}
			}

			if (sort != null && sort instanceof Array) {
				var _iteratorNormalCompletion4 = true;
				var _didIteratorError4 = false;
				var _iteratorError4 = undefined;

				try {
					for (var _iterator4 = sort[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
						s = _step4.value;

						result.sort(this.sortResults(s[0], s.length > 1 ? s[1] : null));
					}
				} catch (err) {
					_didIteratorError4 = true;
					_iteratorError4 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion4 && _iterator4.return) {
							_iterator4.return();
						}
					} finally {
						if (_didIteratorError4) {
							throw _iteratorError4;
						}
					}
				}
			}

			// limit and offset
			start = start && typeof start === "number" ? start : null;
			limit = limit && typeof limit === "number" ? limit : null;

			if (start && limit) {
				result = result.slice(start, start + limit);
			} else if (start) {
				result = result.slice(start);
			} else if (limit) {
				result = result.slice(start, limit);
			}

			return result;
		}
	}, {
		key: "update",
		value: function update(query, updateFunction) {
			var result = [];

			var _iteratorNormalCompletion5 = true;
			var _didIteratorError5 = false;
			var _iteratorError5 = undefined;

			try {
				for (var _iterator5 = this.dataFileObjects[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
					dfo = _step5.value;

					result = result.concat(dfo.updateByFunction(query, updateFunction));
				}
			} catch (err) {
				_didIteratorError5 = true;
				_iteratorError5 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion5 && _iterator5.return) {
						_iterator5.return();
					}
				} finally {
					if (_didIteratorError5) {
						throw _iteratorError5;
					}
				}
			}

			return result;
		}
	}, {
		key: "createNewDatafile",
		value: function createNewDatafile() {
			var file, name;
			name = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
				var r, v;
				r = Math.random() * 16 | 0;
				v = c === 'x' ? r : r & 0x3 | 0x8;
				return v.toString(16);
			});

			file = new File("_" + name, this.client);
			file.readFile();
			// TODO check if we need to wait for file reading here
			return file;
		}
	}, {
		key: "sortResults",
		value: function sortResults(field, order) {
			if (!order) {
				order = null;
			}

			return function (x, y) {
				// case insensitive comparison for string values
				var v1 = typeof x[field] === "string" ? x[field].toLowerCase() : x[field],
				    v2 = typeof y[field] === "string" ? y[field].toLowerCase() : y[field];

				if (order === "DESC") {
					return v1 == v2 ? 0 : v1 < v2 ? 1 : -1;
				} else {
					return v1 == v2 ? 0 : v1 > v2 ? 1 : -1;
				}
			};
		}
	}, {
		key: "call",
		value: function call(func) {
			return typeof func === "function" ? func() : void 0;
		}
	}]);

	return Table;
}();

var FileDB = function () {
	function FileDB(apiKey) {
		_classCallCheck(this, FileDB);

		this.apiKey = apiKey;
		this.allTables = {};
		FileDB.file = File;
		this.client = null;
	}

	/**
  * initializes authentication to Dropbox API, and trigggers
  * loading of tables from Dropbox directory.
  */


	_createClass(FileDB, [{
		key: "setupDropbox",
		value: function setupDropbox(callback) {
			var _this7 = this;

			var promise = new Promise(function (resolve, reject) {
				_this7.client = new Dropbox.Client({
					"key": _this7.apiKey
				});

				_this7.client.authenticate(null, function (error) {
					if (!!error) {
						throw error;
					}
					_this7.loadTables(resolve, reject);
				});
			});

			promise.then(function (value) {
				console.debug("[setupDropbox] all promises resolved, calling callback function");
				callback();
			}).catch(function (error) {
				console.error("[setupDropbox] Error on authentication or table initialization.", error);
			});
		}

		/**
   * Simple data table query. Deprecated in localstoragedb,
   * use queryAll instead consistently.
   * @deprecated
   */

	}, {
		key: "query",
		value: function query(tableName, _query2, sort, start, limit) {
			if (!_query2) _query2 = null;
			if (!sort) sort = null;
			if (!start) start = null;
			if (!limit) limit = null;

			return this.allTables[tableName].query(_query2, sort, start, limit);
		}

		/**
   * Simple data table query.
   */

	}, {
		key: "queryAll",
		value: function queryAll(tableName, params) {
			if (!params) {
				return this.query(tableName);
			} else {
				return this.query(tableName, params.hasOwnProperty('query') ? params.query : null, params.hasOwnProperty('sort') ? params.sort : null, params.hasOwnProperty('start') ? params.start : null, params.hasOwnProperty('limit') ? params.limit : null);
			}
		}

		/**
   * Update rows affected by query.
   */

	}, {
		key: "update",
		value: function update(tableName, query, updateFunction) {
			if (!query) query = null;
			if (typeof updateFunction !== "function") {
				console.warn("updateFunction is empty, but required.");
				return [];
			}

			var result = this.allTables[tableName].update(query, updateFunction);
			console.debug("[FileDB.update] result of update:", result);
			return result;
		}

		/**
   * Returns number of rows for given table.
   */

	}, {
		key: "rowCount",
		value: function rowCount(tableName) {
			return this.query(tableName).length;
		}

		/**
   * Creates a new table with given name and fields.
   */

	}, {
		key: "createTable",
		value: function createTable(tableName, fields) {
			return this.allTables[tableName] = new Table(tableName, fields, this.client);
		}

		/**
   * Creates a new table with given name, and fills in
   * given data as initial data set.
   */

	}, {
		key: "createTableWithData",
		value: function createTableWithData(tableName, data) {
			if ((typeof data === "undefined" ? "undefined" : _typeof(data)) !== 'object' || !data.length || data.length < 1) {
				error("Data supplied isn't in object form. Example: [{k:v,k:v},{k:v,k:v} ..]");
			}

			var fields = Object.keys(data[0]);
			this.createTable(tableName, fields);

			for (var i = 0; i < data.length; i++) {
				this.insert(tableName, data[i]);
			}
			return this.query(tableName);
		}

		/**
   * Insert data row into given table.
   */

	}, {
		key: "insert",
		value: function insert(tableName, data) {
			return this.allTables[tableName].insert(data);
		}

		/**
   * @returns Array with all fields for given table.
   */

	}, {
		key: "tableFields",
		value: function tableFields(tableName) {
			return this.allTables[tableName].getTableFields();
		}

		/**
   * Returns true if database was just created
   * with initialization of this instance.
   */

	}, {
		key: "isNew",
		value: function isNew() {
			return Object.keys(this.allTables).length === 0;
		}

		/**
   * Load table data from Dropbox directory into
   * local memory, preparing the database for operations.
   */

	}, {
		key: "loadTables",
		value: function loadTables(resolve, reject) {
			var _this8 = this;

			this.client.readdir("/", function (error, files) {
				if (!!error) {
					reject(error);
				}

				var file,
				    promises = [];

				var _iteratorNormalCompletion6 = true;
				var _didIteratorError6 = false;
				var _iteratorError6 = undefined;

				try {
					for (var _iterator6 = files[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
						file = _step6.value;

						// files beginning with _ are containing data,
						// tables do not have prefix - we need the tables here
						if (file[0] === "_") {
							continue;
						}

						// add a promise for this file to promises list
						console.debug("[loadTables] add promise for file", file);
						promises.push(new Promise(function (_resolve, _reject) {
							_this8.allTables[file] = new Table(file, false, _this8.client, _resolve, _reject);
						}));
					}

					// wait for all files to be loaded successfully
				} catch (err) {
					_didIteratorError6 = true;
					_iteratorError6 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion6 && _iterator6.return) {
							_iterator6.return();
						}
					} finally {
						if (_didIteratorError6) {
							throw _iteratorError6;
						}
					}
				}

				Promise.all(promises).then(function (values) {
					console.debug("[loadTables] all files loaded successfully, values:", values);
					resolve(values);
				}).catch(function (error) {
					console.debug("[loadTables] failed loading at least one file, error of failed promise:", error);
					reject(error);
				});
			});
		}
	}]);

	return FileDB;
}();
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

/***********************************
 * ExpenSync                       *
 *                                 *
 * EXPENSES-BACKEND.JS             *
 * Backend functions working with  *
 * data and database only          *
 *                                 *
 * CONTRIBUTORS                    *
 * Stephan Giesau                  *
 ***********************************/

window.i18n = {

	month: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],

	weekday: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

};

window.globals = {

	properties: {
		version: '0.3.1',
		appname: 'ExpenSync',
		appkey: 'z0bumu7k3mv0nu3',
		developer: 'Stephan Giesau',
		website: 'http://www.stephan-giesau.de/',
		debug: false
	},
	icons: ['icon-ion-ios7-more', 'icon-ion-ios7-cart', 'icon-ion-fork', 'icon-ion-ios7-wineglass', 'icon-ion-ios7-musical-notes', 'icon-ion-ios7-pricetags', 'icon-ion-model-s', 'icon-ion-plane', 'icon-ion-map', 'icon-ion-ios7-home', 'icon-ion-ios7-briefcase', 'icon-ion-cash', 'icon-ion-ios7-medkit', 'icon-ion-university', 'icon-ion-ios7-home', 'icon-ion-ios7-telephone', 'icon-smile-o', 'icon-frown-o', 'icon-meh-o', 'icon-code', 'icon-question', 'icon-info', 'icon-anchor', 'icon-euro', 'icon-gbp', 'icon-dollar', 'icon-child', 'icon-ion-bag', 'icon-ion-beer', 'icon-ion-card', 'icon-ion-document-text', 'icon-ion-earth', 'icon-ion-female', 'icon-ion-game-controller-b', 'icon-ion-hammer', 'icon-ion-icecream', 'icon-ion-ios7-alarm', 'icon-ion-ios7-albums', 'icon-ion-ios7-americanfootball', 'icon-ion-ios7-baseball', 'icon-ion-ios7-bell', 'icon-ion-ios7-bolt', 'icon-ion-ios7-bookmarks', 'icon-ion-ios7-box', 'icon-ion-ios7-calendar', 'icon-ion-ios7-camera', 'icon-ion-ios7-chatboxes', 'icon-ion-ios7-chatbubble', 'icon-ion-ios7-checkmark-outline', 'icon-ion-ios7-cloud', 'icon-ion-ios7-cloudy-night', 'icon-ion-ios7-contact-outline', 'icon-ion-ios7-copy', 'icon-ion-ios7-drag', 'icon-ion-ios7-email', 'icon-ion-ios7-filing', 'icon-ion-ios7-flag', 'icon-ion-ios7-folder', 'icon-ion-ios7-football-outline', 'icon-ion-ios7-gear-outline', 'icon-ion-ios7-glasses', 'icon-ion-ios7-heart', 'icon-ion-ios7-lightbulb', 'icon-ion-ios7-location', 'icon-ion-ios7-locked', 'icon-ion-ios7-mic', 'icon-ion-ios7-monitor', 'icon-ion-ios7-paper', 'icon-ion-ios7-paperplane', 'icon-ion-ios7-partlysunny', 'icon-ion-ios7-paw', 'icon-ion-ios7-people', 'icon-ion-ios7-person', 'icon-ion-ios7-pie', 'icon-ion-ios7-printer', 'icon-ion-ios7-pulse-strong', 'icon-ion-ios7-rainy', 'icon-ion-ios7-search-strong', 'icon-ion-ios7-snowy', 'icon-ion-ios7-star', 'icon-ion-ios7-sunny', 'icon-ion-ios7-time', 'icon-ion-ios7-trash', 'icon-ion-ios7-unlocked', 'icon-ion-ios7-videocam', 'icon-ion-ipad', 'icon-ion-iphone', 'icon-ion-ipod', 'icon-ion-jet', 'icon-ion-key', 'icon-ion-knife', 'icon-ion-laptop', 'icon-ion-leaf', 'icon-ion-mouse', 'icon-ion-music-note', 'icon-ion-no-smoking', 'icon-ion-pizza', 'icon-ion-playstation', 'icon-ion-social-dropbox', 'icon-ion-social-usd', 'icon-ion-stats-bars', 'icon-ion-wifi', 'icon-ion-woman', 'icon-ion-wrench', 'icon-directions', 'icon-feather', 'icon-flashlight', 'icon-tools', 'icon-droplet', 'icon-hourglass', 'icon-cup', 'icon-rocket', 'icon-brush', 'icon-keyboard', 'icon-database', 'icon-clipboard', 'icon-graph', 'icon-archive'],
	static: {
		infiniteScrollItemsPerLoad: 20
	},
	state: { // to save globally accessible application state variables
		blockedInput: false,
		infiniteScrollLoading: false
	},
	temp: {} // to save objects used temporarily, e.g. from expenses lists

};

/**
* creates initial local database
*/
function createLocalDatabase() {

	// create 'settings' table
	var settings_rows = [{ key: 'db_version', value: window.globals.properties.version, description: 'Version of created database' }, { key: 'ui_lang', value: 'EN', description: 'Language' }, { key: 'ui_money_format', value: 'comma', description: 'Money Format' }, { key: 'sync_enabled', value: true, description: 'Sync enabled' }, { key: 'sync_startup', value: false, description: 'Sync on startup' }, { key: 'sync_continuous', value: true, description: 'Sync continuously or only manually' }, { key: 'sync_lastupdate', value: 1, description: 'Timestamp of last sync' }];
	db.createTableWithData('settings', settings_rows);

	// create 'category' table
	db.createTable('category', ['uniqueid', 'timestamp', 'lastupdate', 'synchronized', 'description', 'icon', 'order', 'disabled']);

	var dateNow = Date.now();
	var _categories = ["Other", "Groceries", "Canteen", "Eating Out", "Fun", "Clothing", "Car", "Transport", "Travel", "Household", "Salary", "Finance", "Medical", "Education", "Rent / Loan", "Communication"];

	for (var k = 0; k < _categories.length; k++) {

		db.insert('category', {
			uniqueid: createUniqueid(k, k, true),
			timestamp: 1,
			lastupdate: 1,
			synchronized: true,
			description: _categories[k],
			icon: k,
			order: k + 1,
			disabled: false
		});
	}

	// create 'item' table
	db.createTable('item', ['uniqueid', 'timestamp', 'lastupdate', 'synchronized', 'account', 'category', 'price', 'description', 'deleted', 'version']);

	// create 'account' table
	db.createTableWithData('account', [{
		uniqueid: createUniqueid(1, 'Default', true),
		timestamp: 1,
		lastupdate: 0,
		synchronized: false,
		description: 'Default',
		initial_balance: 0,
		order: 1,
		disabled: false
	}]);
}

/**
 * delete local database on confirmation
 */
function deleteLocalDatabase() {

	expApp.confirm(
	//'Do you really want to drop the local database? All local data (expenses, settings) will be lost.',
	'This functionality is not available yet.',
	//'Delete Database',
	'OK', function () {

		/*db.drop();
  db = new localStorageDB("expenSync", localStorage);
  createLocalDatabase();
  pageIndexLeft.trigger();
  pageIndex.trigger();*/
	});
}

/**
 * load properties from local DB
 *
 * @param {String} settingName (optional) name of desired settings property. If not defined, all properties are returned
 * @returns property value or object with all settings value pairs
 */
function getSettings(settingName) {

	settingName = settingName || false;

	var query = null;
	if (settingName) query = { key: settingName };

	var props = db.query('settings', query);
	var propsAll = db.query('settings', null); //TODO delete

	//TODO remove debug
	//console.debug("getSettings settingName", settingName, query, props, propsAll);

	if (query) {

		return props[0].value;
	} else {

		var returnObject = {};
		for (i = 0; i < props.length; i++) {

			returnObject[props[i].key] = props[i].value;
		}
		return returnObject;
	}
}

/**
 * set settings in local DB
 *
 * @param {Array<Object>, String} settings properties as object in form {key:<val>, value: <val>} to save into DB, or simple string
 * @param newValue new value for key defined in settings param. Only works if settings param is a string
 */
function setSettings(settings, newValue) {

	if (newValue !== undefined) {

		settings = [{ key: settings, value: newValue }];
	}

	if (settings) {

		for (i = 0; i < settings.length; i++) {

			db.update('settings', { key: settings[i].key }, function (row) {
				row.value = settings[i].value;
				return row;
			});
		}
	}
}

/**
* get icon
*
* @param {int} iconID (optional) ID of icon. If not set, all icons are returned
* @returns icon CSS class or array with all icons
*/
function getIcons(iconID) {

	if (!(iconID === 0)) iconID = iconID || false;

	if (iconID || iconID === 0) {

		return window.globals.icons[iconID];
	} else {

		return window.globals.icons;
	}
}

/**
* load accounts from local DB
*
* @param {String} accountID (optional) ID of account. If not set, all accounts are returned
* @returns account object or array with all accounts
*/
function getAccounts(accountID) {

	accountID = accountID || false;

	var query = null;
	if (accountID) query = { uniqueid: accountID };

	var accs = db.queryAll('account', { 'query': query, 'sort': [['order', 'ASC']] });

	if (query) {

		return accs[0];
	} else {

		var returnArray = [];
		for (i = 0; i < accs.length; i++) {

			returnArray.push(accs[i]);
		}
		return returnArray;
	}
}

/**
* returns all (active) items from a given time range
*
* @param {int/timestamp/Date} startDate start point for selection
* @param {int/timestamp/Date} startDate (exclusive) end point for selection
* @param {boolean} returnBalance (optional) true if balance for items in that timerange should be returned; default false
* @returns items matching this time range OR balance in this time range
*/
function getItemsFromTimerange(startDate, endDate, returnBalance) {

	startDate = new Date(startDate).getTime();
	endDate = new Date(endDate).getTime();
	returnBalance = returnBalance || false;
	var disabledAccounts = [];

	// get all disabled accounts for item filtering
	var allAccounts = db.query('account', { disabled: true });
	for (var i = 0; i < allAccounts.length; i++) {
		disabledAccounts.push(allAccounts[i].uniqueid);
	}

	// get not-deleted items from enabled accounts
	var returnItems = db.queryAll('item', {
		query: function query(row) {
			if (!row.deleted && row.timestamp >= startDate && row.timestamp < endDate && disabledAccounts.indexOf(row.account) === -1) return true;else return false;
		}
	});

	// if only balance was requested
	if (returnBalance) {

		var returnPrice = 0;
		for (var i = 0; i < returnItems.length; i++) {
			returnPrice += returnItems[i].price;
		}
		return returnPrice;
	}

	return returnItems;
}

/**
 * get all entries with lastupdate timestamp newer than given timestamp in params
 *
 * @param {Array<Object>} items array of items with "lastupdate" property
 * @param {timestamp/int} timestamp time limit, all newer entries will be returned
 *
 * @returns {Array<Object>} array of all items with "lastupdate" newer than given timestamp
 */
function getEntriesNewerThan(items, timestamp, table) {

	var result = [];

	for (var i = 0; i < items.length; i++) {

		// for check if local is not newer
		var local = db.query(table, { uniqueid: items[i].uniqueid });

		if (items[i].lastupdate >= timestamp && (local.length == 0 || local[0].lastupdate <= timestamp)) {

			result.push(items[i]);
		}
	}

	return result;
}

/**
 * separate a string str into chunks of given length len
 */
function chunkString(str, len) {
	var _size = Math.ceil(str.length / len),
	    _ret = new Array(_size),
	    _offset;

	for (var _i = 0; _i < _size; _i++) {
		_offset = _i * len;
		_ret[_i] = str.substring(_offset, _offset + len);
	}

	return _ret;
}

/**
 * create CSV file (encoded as utf-8) from JSON object
 */
function createCSVDataLink(tableName, JSONData, title, noLink) {
	noLink = noLink || false;
	var CSV = '';

	// set Report title in first row or line
	CSV += title + '\r\n\n';

	// this condition will generate the Label/Header
	var tableFields = db.tableFields(tableName);
	var row = tableFields.join();
	CSV += row + '\r\n';

	var data = convertJSONtoCSV(JSONData);

	if (data.length == 0) return false;

	CSV += data;

	// initialize file format you want csv or xls
	if (!noLink) CSV = 'data:text/csv;charset=utf-8,' + escape(CSV);

	return CSV;
}

/**
 * convert JSON object to CSV
 */
function convertJSONtoCSV(JSONData) {
	// if JSONData is not an object then JSON.parse will parse the JSON string in an Object
	var arrData = (typeof JSONData === "undefined" ? "undefined" : _typeof(JSONData)) != 'object' ? JSON.parse(JSONData) : JSONData;
	var CSV = '';

	// 1st loop is to extract each row
	for (var i = 0; i < arrData.length; i++) {
		var row = '';

		// 2nd loop will extract each column and convert it in string comma-seprated
		for (var index in arrData[i]) {
			row += '"' + arrData[i][index] + '",';
		}

		CSV += row.slice(0, row.length - 1) + '\r\n';
	}

	return CSV;
}
'use strict';

/***********************************
 * ExpenSync                       *
 *                                 *
 * EXPENSES-STATS.JS               *
 * Statistical functions and       *
 * charting functionality          *
 *                                 *
 * CONTRIBUTORS                    *
 * Stephan Giesau                  *
 ***********************************/

/**
* returns balance difference calculated from active items in given time range
*
* @param {int/timestamp/Date} startDate start point for selection
* @param {int/timestamp/Date} startDate (exclusive) end point for selection
* @returns {float} balance in given time range
*/
function getBalanceFromTimerange(startDate, endDate) {

  return getItemsFromTimerange(startDate, endDate, true);
}

/**
* returns total balance from active items and accounts
*
* @returns {float} total balance of all active accounts and items
*/
function getTotalBalance() {

  var totalBalance = 0;
  var disabledAccounts = [];

  var allAccounts = getAccounts();
  for (var i = 0; i < allAccounts.length; i++) {
    if (allAccounts[i].disabled) disabledAccounts.push(allAccounts[i].uniqueid);else totalBalance += allAccounts[i].initial_balance;
  }

  var activeItems = db.queryAll('item', {
    query: function query(row) {
      if (!row.deleted && disabledAccounts.indexOf(row.account) === -1) return true;else return false;
    }
  });
  for (var i = 0; i < activeItems.length; i++) {
    totalBalance += activeItems[i].price;
  }

  return totalBalance;
}

/**
* returns current total balance for a specific account
*
* @param {String} uniqueid
* @returns {float} total balance an accounts and items
*/
function getAccountBalance(accountID) {

  var accItems = db.queryAll('item', { query: { account: accountID, deleted: false } });
  var accInitBalance = getAccounts(accountID).initial_balance;
  var accBalance = 0;

  for (var i = 0; i < accItems.length; i++) {
    accBalance += accItems[i].price;
  }

  return accBalance + accInitBalance;
}
'use strict';

/***********************************
 * ExpenSync                       *
 *                                 *
 * EXPENSES-SYNC.JS                *
 * All functionality necessary     *
 * for Dropbox synchronization     *
 *                                 *
 * CONTRIBUTORS                    *
 * Stephan Giesau                  *
 ***********************************/

var DROPBOX_APP_KEY = 'sf6zic5mzuzi7k4';

window.client = null; // dropbox client
var ds = null; // dropbox datastore
var dsTable = null; // dropbox main table


// init dropbox client if sync is activated
function syncInit() {

	expApp.showPreloader('Sync with Dropbox ...');

	if (getSettings('sync_enabled')) {

		if (!window.client) {
			window.client = new Dropbox.Client({ key: DROPBOX_APP_KEY });
		}

		// authentication
		window.client.authenticate(null, function (error) {
			if (error) expApp.alert(error);else syncSetup();
		});
	} else {
		expApp.hidePreloader();
		expApp.alert('Please enable sync in settings first before using it.');
	}
}

// after-authentication actions for sync setup
function syncSetup() {

	if (window.globals.properties.debug) console.log('syncSetup');

	if (window.client && window.client.isAuthenticated()) {

		// setup datastore
		if (!ds) {

			client.getDatastoreManager().openDefaultDatastore(function (error, datastore) {
				if (error) {
					expApp.alert('Sync error when opening default datastore: ' + error);
				} else {

					ds = datastore;
					dsTable = ds.getTable('sync');

					// Ensure that future changes sync automatically
					/*if( getSettings('sync_continuous') ) {
     			console.debug('sync continous enabled');//TODO
     	ds.recordsChanged.addListener(syncRequest);
     }*/

					window.setTimeout(function () {
						sync();
					}, 1000);
				}
			});
		} else {
			if (window.globals.properties.debug) console.log('syncSetup/else');
			window.setTimeout(function () {
				sync();
			}, 1000);
		}
	} else {
		expApp.hidePreloader();
		expApp.alert('Sync failed because you are not authenticated with Dropbox yet.');
	}
}

function syncSignOut() {

	if (!window.client) {
		window.client = new Dropbox.Client({ key: DROPBOX_APP_KEY });
	}

	// authentication
	window.client.authenticate(null, function (error) {
		if (error) {
			expApp.alert(error);
		} else {
			if (client.isAuthenticated()) client.signOut();
		}
	});
}

function getSyncTime() {

	return ds ? ds.getModifiedTime() : false;
}

/*function syncRequest(update) {

	console.log('syncRequest');//TODO

	if(ds && !update.isLocal() )
		sync();
}*/

function sync() {

	if (window.globals.properties.debug) console.log('sync');

	var lastSync = getSettings('sync_lastupdate');

	////////////////////
	// item           //
	////////////////////

	// get data
	var syncTable = dsTable.getOrInsert('sync', { name: 'items', json: '[]' });
	var syncTable2 = dsTable.getOrInsert('sync2', { name: 'items2', json: '' });
	var syncTable3 = dsTable.getOrInsert('sync3', { name: 'items3', json: '' });
	var syncJSON = JSON.parse(syncTable.get('json') + syncTable2.get('json') + syncTable3.get('json'));

	// if data available in datastore, merge it and save it back
	if (syncJSON.length > 0) {

		// server has newer data, merge server data to local DB and update server
		if (lastSync < getSyncTime().getTime()) {

			var merge_input = getEntriesNewerThan(syncJSON, lastSync, 'item');

			if (window.globals.properties.debug) console.log('Merge input: ' + merge_input);

			for (i = 0; i < merge_input.length; i++) {

				db.insertOrUpdate('item', { uniqueid: merge_input[i].uniqueid }, merge_input[i]);
			}

			// update timestamp on entries with 'synchronized = false'
			// so these entries are definitely synchronized to other clients
			db.update('item', { synchronized: false }, function (row) {
				row.lastupdate = Date.now();
				row.synchronized = true;
				return row;
			});

			db.commit();
		} else {

			if (window.globals.properties.debug) console.log('Everything is up to date.');
		}

		// if no data in datastore yet, insert local data
	} else {}

		// see below


		// update with local data
		// 3 chunks
	syncItems = JSON.stringify(db.query('item'));
	itemChunks = chunkString(syncItems, Math.ceil(syncItems.length / 3));

	dsTable.query({ name: 'items' })[0].update({
		json: itemChunks[0]
	});
	dsTable.query({ name: 'items2' })[0].update({
		json: itemChunks[1]
	});
	dsTable.query({ name: 'items3' })[0].update({
		json: itemChunks[2]
	});

	////////////////////
	// category       //
	////////////////////

	// get data
	var syncTable = dsTable.getOrInsert('category', { name: 'category', json: '[]' });
	var syncJSON = JSON.parse(syncTable.get('json'));

	// if data available in datastore, merge it and save it back
	if (syncJSON.length > 0) {

		// server has newer data, merge server data to local DB and update server
		if (lastSync < getSyncTime().getTime()) {

			var merge_input = getEntriesNewerThan(syncJSON, lastSync, 'category');

			if (window.globals.properties.debug) console.log('Merge input: ' + merge_input);

			for (i = 0; i < merge_input.length; i++) {

				db.insertOrUpdate('category', { uniqueid: merge_input[i].uniqueid }, merge_input[i]);
			}

			// update timestamp on entries with 'synchronized = false'
			// so these entries are definitely synchronized to other clients
			db.update('category', { synchronized: false }, function (row) {
				row.lastupdate = Date.now();
				row.synchronized = true;
				return row;
			});

			db.commit();
		} else {

			if (window.globals.properties.debug) console.log('Everything is up to date.');
		}

		// if no data in datastore yet, insert local data
	} else {}

		// see below


		// update with local data
	dsTable.query({ name: 'category' })[0].update({
		json: JSON.stringify(db.query('category'))
	});

	////////////////////
	// account        //
	////////////////////

	// get data
	var syncTable = dsTable.getOrInsert('account', { name: 'account', json: '[]' });
	var syncJSON = JSON.parse(syncTable.get('json'));

	// if data available in datastore, merge it and save it back
	if (syncJSON.length > 0) {

		// server has newer data, merge server data to local DB and update server
		if (lastSync < getSyncTime().getTime()) {

			var merge_input = getEntriesNewerThan(syncJSON, lastSync, 'account');

			if (window.globals.properties.debug) console.log('Merge input: ' + merge_input);

			for (i = 0; i < merge_input.length; i++) {

				db.insertOrUpdate('account', { uniqueid: merge_input[i].uniqueid }, merge_input[i]);
			}

			// update timestamp on entries with 'synchronized = false'
			// so these entries are definitely synchronized to other clients
			db.update('account', { synchronized: false }, function (row) {
				row.lastupdate = Date.now();
				row.synchronized = true;
				return row;
			});

			db.commit();
		} else {

			if (window.globals.properties.debug) console.log('Everything is up to date.');
		}

		// if no data in datastore yet, insert local data
	} else {}

		// see below


		// update with local data
	dsTable.query({ name: 'account' })[0].update({
		json: JSON.stringify(db.query('account'))
	});

	// update local sync timestamp
	setSettings('sync_lastupdate', Date.now());

	// refresh views
	pageIndexLeft.trigger();
	pageIndex.trigger();
	expApp.hidePreloader();
}
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

/***********************************
 * ExpenSync                       *
 *                                 *
 * EXPENSES-FRONTEND.JS            *
 * Frontend functions related to   *
 * UI logic and support            *
 *                                 *
 * CONTRIBUTORS                    *
 * Stephan Giesau                  *
 ***********************************/

// TODO fix issue with item update: time shifted +2 hours

// create app object
var expApp = new Framework7({
	init: false, // disabled so page callbacks for initial pages work
	modalTitle: 'ExpenSync',
	notificationCloseOnClick: true
});

// Export selectors engine
var $$ = Dom7;

// Add views
var leftView = expApp.addView('.view-left', {
	// Because we use fixed-through navbar we can enable dynamic navbar
	dynamicNavbar: true
});
var mainView = expApp.addView('.view-main', {
	// Because we use fixed-through navbar we can enable dynamic navbar
	dynamicNavbar: true
});

// Load DB
// Initialise. If the database doesn't exist, it is created
var db = new FileDB(window.globals.properties.appkey);
db.setupDropbox(function () {
	// Check if the database was just created. Then create all tables
	if (db.isNew()) {
		createLocalDatabase();
	}

	$('.splash-screen').hide();

	initApp();
});

/**
 * create a unique ID for items based on time, a given salt and browser's user agent
 */
function createUniqueid(timestamp, salt, noUserAgent) {

	noUserAgent = noUserAgent || false;

	var str = '' + timestamp + salt;
	if (!noUserAgent) str += navigator.userAgent;

	return calcMD5(str);
}

/**
 * returns a price, in currency format set by settings
 *
 * @param {float} price number to be displayed as price
 * @returns {string} formatted price
 */
function getFormattedPrice(price) {

	price = parseFloat(price).toFixed(2);

	// get number format from settings
	money_format = getSettings('ui_money_format');
	if (money_format === 'comma') price = price.replace('.', ',');

	return price;
}

/**
 * returns a price, suitable colored and currency format
 *
 * @param {float} price number to be displayed as price
 * @param {string} account (optional) text to be displayed below price; false
 * @returns {string} HTML with formatted price
 */
function formatPrice(price, account) {

	account = account || false;

	colorClass = 'red';
	if (price >= 0) colorClass = 'green';

	formattedPrice = getFormattedPrice(price);

	// account displayed below price
	// only if more than one account available
	var subtext = '';
	if (account) {

		account = getAccounts(account);

		if (account.disabled) colorClass = 'gray';

		if (db.rowCount('account') > 1) subtext = '<br><span class="item-subtitle color-gray">' + account.description + '</span>';
	}

	return '<span class="color-' + colorClass + '">' + formattedPrice + subtext + '</span>';
}

/**
 * returns a datetime formatted as a string from given string/timestamp
 *
 * @param {int/timestamp} dateString timestamp basing the date output
 * @param {boolean} forFieldInput (optional) true if output is for input field
 */
function formatDate(dateString, forFieldInput) {

	forFieldInput = forFieldInput || false;

	date = new Date(dateString);

	day = date.getDate();
	if ((day + '').length == 1) day = '0' + day;

	month = date.getMonth() + 1; // month is 0-based
	if ((month + '').length == 1) month = '0' + month;

	hours = date.getHours();
	if ((hours + '').length == 1) hours = '0' + hours;

	minutes = date.getMinutes();
	if ((minutes + '').length == 1) minutes = '0' + minutes;

	if (forFieldInput) return date.getFullYear() + '-' + month + '-' + day + 'T' + hours + ':' + minutes;else return day + '.' + month + '.' + date.getFullYear() + ' ' + hours + ':' + minutes;
}

/**
 * adds categories as options to select dropdown
 * and optionally selects one entry
 *
 * @param {domSelector/jQueryObject} domElement selector or element representing a select dropdown
 * @param {int} selectedID (optional) ID number of category to select
 * @param {boolean} appendZero (optional) true if entry with ID 0 (= All) should be prepended
 * @param {boolean} allEntries (optional) true if all entries should be put out, if false only enabled entries are selected
 */
function createCategoryOptions(domElement, selectedID, appendZero, allEntries) {

	selectedID = selectedID || false;
	appendZero = appendZero || false;
	allEntries = allEntries || false;
	var $list = $(domElement);
	var $temp = $('<div />');

	// empty dropdown list
	$list.empty();

	// if zero element should be appended
	if (appendZero) $list.append($('<option>').val(0).text('All'));

	var catQuery = { disabled: false };
	if (allEntries) catQuery = null;

	var categories = db.queryAll('category', { query: catQuery, sort: [['order', 'ASC']] });

	for (i = 0; i < categories.length; i++) {

		var $option = $('<option>').val(categories[i].uniqueid).text(categories[i].description);

		// select entry if defined
		if (selectedID && selectedID == categories[i].uniqueid) $option.attr('selected', 'selected');

		$temp.append($option);
	}

	// add to actual list
	$list.append($temp.html());
}

/**
* adds accounts as options to select dropdown
* and optionally selects one entry
*
* @param {domSelector/jQueryObject} domElement selector or element representing a select dropdown
* @param {int} selectedID (optional) ID number of account to select
* @param {boolean} appendZero (optional) true if entry with ID 0 (= All) should be prepended
* @param {boolean} allEntries (optional) true if all entries should be put out, if false only enabled entries are selected
*/
function createAccountOptions(domElement, selectedID, appendZero, allEntries) {

	selectedID = selectedID || false;
	appendZero = appendZero || false;
	allEntries = allEntries || false;
	var $list = $(domElement);
	var $temp = $('<div />');

	// empty dropdown list
	$list.empty();

	// if zero element should be appended
	if (appendZero) $list.append($('<option>').val(0).text('All'));

	var accQuery = { disabled: false };
	if (allEntries) accQuery = null;

	var accounts = db.queryAll('account', { query: accQuery, sort: [['order', 'ASC']] });

	for (i = 0; i < accounts.length; i++) {

		var $option = $('<option>').val(accounts[i].uniqueid).text(accounts[i].description);

		// select entry if defined
		if (selectedID && selectedID == accounts[i].uniqueid) $option.attr('selected', 'selected');

		$temp.append($option);
	}

	// add to actual list
	$list.append($temp.html());
}

/**
 * Validates fields from add/edit item forms and formats in appropriate data type
 *
 * @param {float/string} price field 'price' from item table
 * @param {string} category field 'category' from item table
 * @param {string} description field 'description' from item table
 * @param {string/int} field 'date' from item table
 * @param {string} account field 'account' from item table
 * @param {boolean/string} deleted field 'deleted' from item table
 * @return false if invalid, else an object with validated and formatted values
 */
function validateItemForm(price, category, description, date, account, deleted) {

	var validPrice, validCategory, validDescription, validDate, validAccount, validDeleted;
	deleted = deleted || false;

	// check if minimum input (price) is given
	if (price != 0 && price != null && parseFloat(price) != NaN && price.length != 0) {

		validPrice = parseFloat(price);
		validCategory = category;
		validDescription = description.replace('"', "'");
		validDeleted = deleted == 'true';
		validAccount = account;

		if (account.length > 1 && category.length > 1) {

			// check if date is given, if yes, try to parse it
			if (date == undefined || date == null || date.length == 0 || Date.parse(date) == NaN) {
				validDate = Date.now();
			} else {
				validDate = Date.parse(date);
			}

			var returnObj = {
				price: validPrice,
				category: validCategory,
				description: validDescription,
				date: validDate,
				deleted: validDeleted,
				account: validAccount
			};

			return returnObj;
		} else {
			expApp.alert('Please select an account and a category.');
		}
	} else {
		expApp.alert('Please fill in a cost.');
	}

	return false;
}

/**
 * Creates an HTML list of items, based on given parameters for the query
 *
 * @param {domSelector/jQueryObject} domList Element to be filled with the result list
 * @param {object/function} itemQuery Query to select items from database, or null for all
 * @param {array} itemSort Sorting parameters, or null
 * @param {object} itemLimit Limit for the result array
 * @param {domSelector/jQueryObject} domBalance Element to put the list balance in
 * @param {boolean} noDelete (optional) If true, delete button will not be added; default is false
 * @param {String} tempID (optional) tempID for page query object (in window.globals)
 * @param {boolean} infiniteScrollReset if true, list will be emptied before appending items
 */
function createItemListElements(domList, itemQuery, itemSort, itemLimit, domBalance, noDelete, tempID, infiniteScrollReset) {

	domBalance = domBalance || false;
	noDelete = noDelete || false;
	infiniteScrollReset = infiniteScrollReset || false;
	$list = $('<ul />');
	if (domBalance) $balance = $(domBalance);

	var listBalance = 0;
	var page = window.globals.temp[tempID];

	// get categories
	var categories = db.queryAll('category', { sort: [['order', 'ASC']] });
	var _category = {};
	for (var j = 0; j < categories.length; j++) {
		_category[categories[j].uniqueid] = categories[j];
	}

	// get items according to request params
	items = db.queryAll('item', {
		query: itemQuery,
		sort: itemSort,
		limit: itemLimit
	});

	// set up variables for infinite scroll loading
	if (infiniteScrollReset) {
		page.infiniteScroll = {
			endReached: false,
			lastIndex: 0
		};
		// remove loader if list is shorter than load limit
		if (items.length <= window.globals.static.infiniteScrollItemsPerLoad) {
			expApp.detachInfiniteScroll('.infinite-scroll-' + tempID);
			$(page.container).find('.infinite-scroll-preloader').remove();
		}
	}

	// add items to expenses list
	for (i = 0; i < items.length; i++) {

		var row = items[i];
		listBalance += row.price;

		// render items if in current load range
		if (i >= page.infiniteScroll.lastIndex && i < page.infiniteScroll.lastIndex + window.globals.static.infiniteScrollItemsPerLoad) {

			var rowCategory = _category[row.category];
			var description = row.description;
			var category = ' | ' + rowCategory.description;

			if (description == null || description.length == 0) {
				description = '<span class="color-gray">' + rowCategory.description + '</span>';
				category = '';
			}

			// don't add delete button, if param is set
			var deleteButton = '<a class="swipeout-delete swipeout-overswipe" data-confirm="Are you sure that you want to delete this item?" href="">Delete</a>';
			if (noDelete) deleteButton = '';

			$list.append('<li class="swipeout" data-uniqueid="' + row.uniqueid + '" data-tempid="' + tempID + '">' + '	<div class="swipeout-content item-content">' + '		<div class="item-media">' + '			<span class="icon-wrap"><i class="color-black icon ion ' + getIcons(rowCategory.icon) + '"></i></span>' + '		</div>' + '		<div class="item-inner">' + '			<div class="item-title-row">' + '				<div class="item-title">' + description + '</div>' + '				<div class="item-after">' + formatPrice(row.price, row.account) + '				</div>' + '			</div>' + '			<div class="item-subtitle color-gray">' + formatDate(row.timestamp) + category + '</div>' + '		</div>' + '	</div>' + '	<div class="swipeout-actions-right">' + '		<a href="" class="edit-item" data-uniqueid="' + row.uniqueid + '" data-tempid="' + tempID + '">Edit</a>' + deleteButton + '	</div>' + '</li>');
		}
	}

	// update infiniteScroll variables
	page.infiniteScroll.lastIndex = page.infiniteScroll.lastIndex + window.globals.static.infiniteScrollItemsPerLoad;
	if (page.infiniteScroll.lastIndex > items.length) page.infiniteScroll.endReached = true;

	//flush list to DOM element
	if (infiniteScrollReset) $(domList).empty();
	$(domList).append($list.html());

	// output list balance
	if (domBalance) $balance.html(formatPrice(listBalance));

	// handler for editing items - open popup
	$$('.page-expenses-list .edit-item').on('click', function (e) {

		var editID = $(e.target).attr('data-uniqueid');
		var tempID = $(e.target).attr('data-tempid');

		// get item data and fill in the form on popup
		var editItem = db.query('item', { uniqueid: editID })[0];

		$('.popup-edit-item').attr('data-uniqueid', editID);
		$('.popup-edit-item').attr('data-tempid', tempID);

		$('.popup-edit-item #form-edit-price').val(editItem.price);
		$('.popup-edit-item #form-edit-description').val(editItem.description);
		$('.popup-edit-item #form-edit-date').val(formatDate(editItem.timestamp, true));
		$('.popup-edit-item').attr('data-deleted', editItem.deleted);
		createCategoryOptions($('.popup-edit-item #form-edit-category'), editItem.category, false, true);
		createAccountOptions($('.popup-edit-item #form-edit-account'), editItem.account, false, true);

		// datepicker
		//createDatetimePicker(new Date(editItem.timestamp), '#form-edit-date');

		// if deleted, show restore button and add restore handler
		if (editItem.deleted) {

			$('.popup-edit-item #form-edit-restore').show();

			$('.popup-edit-item #form-edit-restore').on('click', function (e) {

				$('.popup-edit-item').attr('data-deleted', false);
				$('.popup-edit-item-save').click();
			});
		} else {

			$('.popup-edit-item #form-edit-restore').hide();
		}

		// save handler
		$('.popup-edit-item-save').on('click', function (e) {

			e.preventDefault();
			var editID = $('.popup-edit-item').attr('data-uniqueid');
			var tempID = $('.popup-edit-item').attr('data-tempid');

			if (editID.length > 1) {

				var newPrice = $('.popup-edit-item #form-edit-price').val();
				var newCategory = $('.popup-edit-item #form-edit-category').val();
				var newDescription = $('.popup-edit-item #form-edit-description').val();
				var newDate = $('.popup-edit-item #form-edit-date').val();
				var newDeleted = $('.popup-edit-item').attr('data-deleted');
				var newAccount = $('.popup-edit-item #form-edit-account').val();

				var validItem = validateItemForm(newPrice, newCategory, newDescription, newDate, newAccount, newDeleted);

				if (validItem) {

					db.update('item', { uniqueid: editID }, function (row) {
						row.price = validItem.price;
						row.category = validItem.category;
						row.account = validItem.account;
						row.description = validItem.description;
						row.timestamp = validItem.date;
						row.deleted = validItem.deleted;
						row.lastupdate = Date.now();
						row.synchronized = false;
						row.version = window.globals.properties.version;
						return row;
					});

					expApp.closeModal('.popup-edit-item');

					//re-render list to represent changes
					updateItemList($(page.container).find('#expenses-list-category').val(), tempID, true);

					pageIndexLeft.trigger();
					pageIndex.trigger();
				}
			}
		});

		expApp.popup('.popup-edit-item');
	});

	// handler for deleting items
	$$('.page-expenses-list .swipeout').on('deleted', function (e) {

		delID = $(e.target).attr('data-uniqueid');

		console.log('deleted item ', delID);

		// mark item as deleted
		db.update('item', { uniqueid: delID }, function (row) {
			row.deleted = true;
			row.lastupdate = Date.now();
			row.synchronized = false;
			return row;
		});
		delItem = db.query('item', { uniqueid: delID });

		// get category description
		delItemCategory = db.query('category', { uniqueid: delItem[0].category });

		// set item description if available
		notificationDescription = '';
		if (delItem[0].description != null && delItem[0].description.length != 0) {
			notificationDescription = ': ' + delItem[0].description;
		}

		//trigger refresh of menu
		pageIndexLeft.trigger();
		pageIndex.trigger();

		// open notification for deletion
		expApp.addNotification({
			title: 'Item removed',
			message: formatPrice(delItem[0].price) + '</span> for <span class="color-blue">' + delItemCategory[0].description + '</span>' + notificationDescription,
			hold: 1000
		});
	});
}

/**
 * Creates an HTML list of categories in given DOM element
 *
 * @param {domSelector/jQueryObject} domSelector DOM element to be filled with resulting list
 */
function createCategoryListElements(domSelector) {

	$list = $(domSelector).empty();

	var _category = db.queryAll('category', { sort: [['order', 'ASC']] });

	for (var i = 0; i < _category.length; i++) {

		var cat = _category[i];

		var checked = cat.disabled ? '' : ' checked="checked"';

		$list.append('<li class="swipeout" data-uniqueid="' + cat.uniqueid + '">' + '	<label class="label-checkbox swipeout-content item-content disabled">' + '		<input type="checkbox" id="cat-' + cat.uniqueid + '"' + checked + '>' + '		<div class="item-media">' + '			<i class="icon icon-form-checkbox"></i>' + '		</div>' + '		<div class="item-inner">' + '			<div class="item-title">' + cat.description + '</div>' + '			<div class="item-after">' + '				<i class="icon ion ' + getIcons(cat.icon) + '"></i>' + '			</div>' + '		</div>' + '	</label>' + '	<div class="sortable-handler"></div>' + '	<div class="swipeout-actions-right">' + '		<a href="#" class="edit-category" data-uniqueid="' + cat.uniqueid + '">Edit</a>' + '	</div>' + '</li>');
	}
	$list.append('<li><a class="item-link list-button" id="settings-categories-add">Add category</a></li>');

	// handler for editing categories - open popup
	$(domSelector).find('.edit-category').on('click', function (e) {

		var editID = $(e.target).attr('data-uniqueid');

		openCategoryPopup(editID);
	});

	// handler for 'add category' button
	$('#settings-categories-add').on('click', function (e) {

		e.preventDefault();

		var newID = createUniqueid(Date.now(), 'New Category' + Date.now());

		db.insert('category', {
			uniqueid: newID,
			timestamp: Date.now(),
			lastupdate: Date.now(),
			synchronized: false,
			description: 'New Category',
			icon: 0,
			order: 99,
			disabled: false
		});

		openCategoryPopup(newID);
		createCategoryListElements(domSelector);
	});
}

/**
* Creates an HTML list of accounts in given DOM element
*
* @param {domSelector/jQueryObject} domSelector DOM element to be filled with resulting list
*/
function createAccountListElements(domSelector) {

	$list = $(domSelector).empty();

	var accounts = db.queryAll('account', { sort: [['order', 'ASC']] });

	for (var i = 0; i < accounts.length; i++) {

		var acc = accounts[i];

		var checked = acc.disabled ? '' : ' checked="checked"';

		$list.append('<li class="swipeout" data-uniqueid="' + acc.uniqueid + '">' + '	<label class="label-checkbox swipeout-content item-content disabled">' + '		<input type="checkbox" id="cat-' + acc.uniqueid + '"' + checked + '>' + '		<div class="item-media">' + '			<i class="icon icon-form-checkbox"></i>' + '		</div>' + '		<div class="item-inner">' + '			<div class="item-title">' + acc.description + '</div>' + '			<div class="item-after">' + formatPrice(acc.initial_balance) + '			</div>' + '		</div>' + '	</label>' + '	<div class="sortable-handler"></div>' + '	<div class="swipeout-actions-right">' + '		<a href="#" class="edit-category" data-uniqueid="' + acc.uniqueid + '">Edit</a>' + '	</div>' + '</li>');
	}
	$list.append('<li><a class="item-link list-button" id="settings-accounts-add">Add account</a></li>');

	// handler for editing categories - open popup
	$(domSelector).find('.edit-category').on('click', function (e) {

		var editID = $(e.target).attr('data-uniqueid');

		openAccountPopup(editID);
	});

	// handler for 'add category' button
	$('#settings-accounts-add').on('click', function (e) {

		e.preventDefault();

		var newID = createUniqueid(Date.now(), 'New Account' + Date.now());

		db.insert('account', {
			uniqueid: newID,
			timestamp: Date.now(),
			lastupdate: Date.now(),
			synchronized: false,
			description: 'New Account',
			initial_balance: 0,
			order: 99,
			disabled: false
		});

		openAccountPopup(newID);
		createAccountListElements(domSelector);
	});
}

/**
* get items based on expenses-list page query and optional category
*
* @param {String} filterCategory ID of category by which the list is filtered
* @param {String} tempID ID of page object in globals.temp
* @param {boolean} infiniteScrollReset if true, list will be emptied before appending items
*/
function updateItemList(filterCategory, tempID, infiniteScrollReset) {

	filterCategory = filterCategory || 0;
	infiniteScrollReset = infiniteScrollReset || false;
	page = window.globals.temp[tempID];

	// evaluate page params to determine what to display
	// standard values
	var itemQuery = { deleted: false };
	var itemSort = [['timestamp', 'DESC']];
	var itemLimit = null;
	var itemDomBalance = $(page.container).find('#expenses-list-balance');
	var itemNoDelete = false;

	// add filter for category
	if (filterCategory != 0) itemQuery.category = filterCategory;

	// override standards for special conditions
	switch (page.query.request) {

		case 'timerange':

			// if no range is defined, get latest
			if (page.query.start == null || page.query.end == null) {
				itemLimit = 50;
				page.query.title = 'Latest by date (error)';
				break;
			}

			itemQuery = function itemQuery(row) {
				if (!row.deleted && row.timestamp >= page.query.start && row.timestamp < page.query.end && (filterCategory == 0 || row.category == filterCategory)) return true;else return false;
			};
			break;

		case 'deleted':
			itemQuery.deleted = true;
			itemSort = [['lastupdate', 'DESC']];
			itemLimit = 50;
			itemDomBalance = false;
			itemNoDelete = true;
			page.query.title = 'Last deleted';
			break;

		case 'lastupdate':
			itemSort = [['lastupdate', 'DESC']];
			itemLimit = 50;
			itemDomBalance = false;
			page.query.title = 'Last updated';
			break;

		case 'latest':
		default:
			itemLimit = 50;
			itemDomBalance = false;
			page.query.title = 'Latest by date';
			break;
	}

	// add page title
	$(page.navbarInnerContainer).find('#expenses-list-title').html(page.query.title.replace('+', ' '));
	// add items to list
	createItemListElements($(page.container).find('#expenses-list-items'), itemQuery, itemSort, itemLimit, itemDomBalance, itemNoDelete, tempID, infiniteScrollReset);
}

/**
 * Opens 'edit category' popup with given category uniqueid
 *
 * @param {String} editID uniqueid of category to be edited
 */
function openCategoryPopup(editID) {

	// get item data and fill in the form on popup
	var editCat = db.query('category', { uniqueid: editID })[0];

	$('.popup-edit-category').attr('data-uniqueid', editID);
	$('.popup-edit-category #form-category-description').val(editCat.description);

	// create icon selector
	$('.popup-edit-category #form-category-icon').empty();
	var icons = getIcons();
	for (var z = 0; z < icons.length; z++) {

		var selected = '';
		if (z == editCat.icon) selected = ' class="icon-selected"';

		$('.popup-edit-category #form-category-icon').append('<li data-id="' + z + '"' + selected + '><i class="' + icons[z] + '"></i></li>');
	}
	$('.popup-edit-category #form-category-icon li').on('click', function (e) {
		$(e.delegateTarget).addClass('icon-selected');
		$(e.delegateTarget).siblings().removeClass('icon-selected');
	});

	// save handler
	$('.popup-edit-category-save').on('click', function (e) {

		e.preventDefault();
		var editID = $('.popup-edit-category').attr('data-uniqueid');

		if (editID.length > 1) {

			var newDescription = $('.popup-edit-category #form-category-description').val();
			var newIcon = $('.popup-edit-category #form-category-icon li.icon-selected').attr('data-id');

			if (newDescription.length > 0 && newIcon.length > 0) {

				db.update('category', { uniqueid: editID }, function (row) {
					row.description = newDescription;
					row.icon = newIcon;
					row.synchronized = false;
					row.lastupdate = Date.now();
					return row;
				});

				createCategoryListElements('#settings-categories-list');

				expApp.closeModal('.popup-edit-category');
			} else {

				expApp.alert('Please fill in a description and choose an icon.');
			}
		} else {

			expApp.alert('Could not save: no ID found. Please cancel and try again.');
		}
	});

	expApp.popup('.popup-edit-category');
}

/**
* Opens 'edit account' popup with given account uniqueid
*
* @param {String} editID uniqueid of account to be edited
*/
function openAccountPopup(editID) {

	// get item data and fill in the form on popup
	var editObj = db.query('account', { uniqueid: editID })[0];

	$('.popup-edit-account').attr('data-uniqueid', editID);
	$('.popup-edit-account #form-account-description').val(editObj.description);
	$('.popup-edit-account #form-account-balance').val(editObj.initial_balance);

	// save handler
	$('.popup-edit-account-save').on('click', function (e) {

		e.preventDefault();
		var editID = $('.popup-edit-account').attr('data-uniqueid');

		if (editID.length > 1) {

			var newDescription = $('.popup-edit-account #form-account-description').val();
			var newBalance = parseFloat($('.popup-edit-account #form-account-balance').val());

			if (newDescription.length > 0 && ('' + newBalance).length > 0 && newBalance != NaN) {
				//TODO validation of numbers

				db.update('account', { uniqueid: editID }, function (row) {
					row.description = newDescription;
					row.initial_balance = newBalance;
					row.synchronized = false;
					row.lastupdate = Date.now();
					return row;
				});

				createAccountListElements('#settings-accounts-list');
				// recalculate the total balance on index page
				pageIndex.trigger();

				expApp.closeModal('.popup-edit-account');
			} else {

				expApp.alert('Please fill in a description and an initial balance.');
			}
		} else {

			expApp.alert('Could not save: no ID found. Please cancel and try again.');
		}
	});

	expApp.popup('.popup-edit-account');
}

/**
 * Creates a date picker for given element with given start point
 *
 * @param {Date} dateObj date as reference for field start value, or false for current time
 * @param {String} cssSelector selector for target input field
 */
function createDatetimePicker(dateObj, cssSelector) {

	var today = new Date();

	if (!dateObj) dateObj = today;

	var picker = expApp.picker({
		input: cssSelector,
		toolbar: false,
		inputReadOnly: true,
		rotateEffect: false,

		value: [dateObj.getMonth(), dateObj.getDate(), dateObj.getFullYear(), dateObj.getHours(), dateObj.getMinutes() < 10 ? '0' + dateObj.getMinutes() : dateObj.getMinutes()],

		onChange: function onChange(picker, values, displayValues) {
			var daysInMonth = new Date(picker.value[2], picker.value[0] * 1 + 1, 0).getDate();
			if (values[1] > daysInMonth) {
				picker.cols[1].setValue(daysInMonth);
			}
		},

		formatValue: function formatValue(p, values, displayValues) {

			var month = parseInt(values[1]) + 1;
			return values[2] + '-' + (month < 10 ? '0' + month : month) + '-' + (values[0] < 10 ? '0' + values[0] : values[0]) + 'T' + values[3] + ':' + values[4];
		},

		cols: [
		// Days
		{
			values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
			textAlign: 'right',
			cssClass: 'smaller'
		},
		// Divider
		{
			divider: true,
			content: '.',
			cssClass: 'smaller'
		},
		// Months
		{
			values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
			displayValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], //TODO('January February March April May June July August September October November December').split(' '),
			textAlign: 'right',
			cssClass: 'smaller'
		},
		// Divider
		{
			divider: true,
			content: '.',
			cssClass: 'smaller'
		},
		// Years
		{
			values: function () {
				var arr = [];
				for (var i = (dateObj.getFullYear() < today.getFullYear() ? dateObj.getFullYear() : today.getFullYear()) - 5; i <= (dateObj.getFullYear() > today.getFullYear() ? dateObj.getFullYear() : today.getFullYear()) + 5; i++) {
					arr.push(i);
				}
				return arr;
			}(),
			cssClass: 'smaller'
		},
		// Space divider
		{
			divider: true,
			content: ' ',
			cssClass: 'smaller'
		},
		// Hours
		{
			values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
			cssClass: 'smaller'
		},
		// Divider
		{
			divider: true,
			content: ':',
			cssClass: 'smaller'
		},
		// Minutes
		{
			values: function () {
				var arr = [];
				for (var i = 0; i <= 59; i++) {
					arr.push(i < 10 ? '0' + i : i);
				}
				return arr;
			}(),
			cssClass: 'smaller'
		}]
	});
	return picker;
}

function initApp() {

	//////////////////////////////////////////////////////////////////
	// index-left menu                                              //
	//////////////////////////////////////////////////////////////////
	pageIndexLeft = expApp.onPageInit('index-left', function (page) {

		// generate links to expenses in menu
		var currentMonth = new Date().getMonth();
		var currentYear = new Date().getFullYear();
		var startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
		var endDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);

		$('#menu-list').empty();
		var entriesAvailable = false;

		// TODO parameter to set amount of months to be shown
		for (var i = 15; i >= 0; i--) {

			startDate.setFullYear(currentYear, currentMonth);
			endDate.setFullYear(currentYear, currentMonth + 1);

			// create menu link label and data object (is given to expenses page)
			// data object contains information which list to show
			var monthLabel = window.i18n.month[currentMonth] + ' ' + currentYear;
			var dataObj = {
				request: 'timerange',
				start: startDate.getTime(),
				end: endDate.getTime(),
				title: monthLabel
			};

			// get items for current month
			var monthBalance = 0;
			var monthItems = getItemsFromTimerange(startDate.getTime(), endDate.getTime());

			// only generate link if month has items
			if (monthItems.length > 0) {

				entriesAvailable = true;

				// calculate month balance
				for (var j = 0; j < monthItems.length; j++) {
					monthBalance += monthItems[j].price;
				}

				// add link to menu
				$('#menu-list').append('<li><a href="expenses-list.html?' + $.param(dataObj) + '" data-view=".view-main" class="item-link close-panel item-content">' + '	<div class="item-inner">' + '		<div class="item-title">' + monthLabel + '</div>' + '		<div class="item-after">' + formatPrice(monthBalance) + '</div>' + '</div></a></li>');
			}

			currentMonth--;
			if (currentMonth == -1) {
				currentMonth = 11;
				currentYear--;
			}
		}

		// if no entries found, show notice
		if (!entriesAvailable) {

			$('#menu-list').append('<li><div class="item-content">' + '	<div class="item-inner">' + '		No expenses added yet.' + '</div></div></li>');
			// if entries, show additional sortings.
		} else {

			$('#menu-list').append('<li><a href="expenses-list.html?request=lastupdate" data-view=".view-main" class="item-link close-panel item-content">' + '	<div class="item-inner">' + '		Last updated' + '</div></a></li>' + '<li><a href="expenses-list.html?request=latest" data-view=".view-main" class="item-link close-panel item-content">' + '	<div class="item-inner">' + '		Latest by date' + '</div></a></li>' + '<li><a href="expenses-list.html?request=deleted" data-view=".view-main" class="item-link close-panel item-content">' + '	<div class="item-inner">' + '		Last deleted' + '</div></a></li>');
		}
	});

	//////////////////////////////////////////////////////////////////
	// Index                                                        //
	//////////////////////////////////////////////////////////////////
	pageIndex = expApp.onPageInit('index index-1', function (page) {

		// assume main view if page is not defined
		page = page || { container: '.view-main' };

		// add categories/accounts to dropdown select
		createCategoryOptions($(page.container).find('#form-add-category'));
		createAccountOptions($(page.container).find('#form-add-account'), false, false, true);

		// datepicker
		var today = new Date();
		//createDatetimePicker(today, '#form-add-date');

		// add expense form: submit handler
		$(page.container).find('#form-add-submit').on('click', function (e) {

			e.preventDefault();

			// disable multiple inputs in short time
			if (!window.globals.state.blockedInput) {

				// disable button to prevent multiple entries (by accident)
				that = $(e.target);
				that.addClass('disabled');
				window.globals.state.blockedInput = true;
				window.setTimeout(function () {
					that.removeClass('disabled');
					window.globals.state.blockedInput = false;
				}, 1000);

				var addPrice = $(page.container).find('#form-add-price').val();
				var addCategory = $(page.container).find('#form-add-category').val();
				var addDescription = $(page.container).find('#form-add-description').val();
				var addDate = $(page.container).find('#form-add-date').val();
				var addAccount = $(page.container).find('#form-add-account').val();

				var validItem = validateItemForm(addPrice, addCategory, addDescription, addDate, addAccount, false);

				if (validItem) {

					// empty input fields to prevent mistaken new entries
					$(page.container).find('#form-add-price').val('');
					$(page.container).find('#form-add-description').val('');
					$(page.container).find('#form-add-date').val('');

					// insert new item in DB
					var addID = db.insert('item', {
						uniqueid: createUniqueid(Date.now(), addDate + addDescription + addPrice + addCategory + addAccount),
						timestamp: validItem.date,
						lastupdate: Date.now(),
						synchronized: false,
						account: validItem.account,
						category: validItem.category,
						price: validItem.price,
						description: validItem.description,
						deleted: false,
						version: window.globals.properties.version
					});

					var addCategoryDescription = db.query('category', { uniqueid: addCategory });

					var notificationDescription = '';
					if (addDescription != null && addDescription.length != 0) {
						notificationDescription = ': ' + addDescription;
					}

					expApp.addNotification({
						title: 'Expense added',
						message: formatPrice(addPrice) + ' for <span class="color-blue">' + addCategoryDescription[0].description + '</span>' + notificationDescription,
						hold: 1000
					});

					//trigger refresh of menu
					pageIndexLeft.trigger();
					pageIndex.trigger();
				}
			}
		});

		// insert balances
		// total balance
		var totalBalance = getTotalBalance();
		$(page.container).find('#total-balance').html(formatPrice(totalBalance));

		// current month's balance
		var currentMonth = today.getMonth();
		var currentYear = today.getFullYear();
		var startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
		var endDate = new Date(currentYear, currentMonth + 1, 1, 0, 0, 0, 0);

		var currentBalance = getBalanceFromTimerange(startDate, endDate);
		$(page.container).find('#total-balance-month').html(formatPrice(currentBalance));

		// last month's total balance
		var lastBalance = totalBalance - currentBalance;
		$(page.container).find('#total-balance-lastmonth').html(formatPrice(lastBalance));

		// account balances
		var accounts = getAccounts();
		$(page.container).find('#index-account-balance').empty();

		for (var a = 0; a < accounts.length; a++) {

			var balance = getAccountBalance(accounts[a].uniqueid);
			//TODO console.debug('index page, account balances: ', accounts[a].uniqueid, balance);

			$(page.container).find('#index-account-balance').append('<li><div class="item-content">' + '	<div class="item-inner">' + '		<div class="item-title">' + accounts[a].description + '</div>' + '		<div class="item-after">' + formatPrice(balance) + '</div>' + '	</div>' + '</div></li>');
		}
	});

	//////////////////////////////////////////////////////////////////
	// expenses-list                                                //
	//////////////////////////////////////////////////////////////////
	expApp.onPageInit('expenses-list', function (page) {

		// save page query for later usage in globals.temp
		var tempID = createUniqueid(Date.now(), page.query.request);
		window.globals.temp[tempID] = page;
		$(page.container).find('#expenses-list-category').attr('data-temppage', tempID);

		// add categories to dropdown select
		createCategoryOptions($(page.container).find('#expenses-list-category'), false, true);

		// category dropdown: onchange handler
		$(page.container).find('#expenses-list-category').on('change', function (e) {

			var catID = $(e.delegateTarget).val();
			var tempID = $(e.delegateTarget).attr('data-temppage');

			updateItemList(catID, tempID, true);
			console.debug("change list category", e, catID, tempID);
		});

		// add tempID to page-content container and attach infinite scroll
		$(page.container).find('.page-content').addClass('infinite-scroll-' + tempID);
		expApp.attachInfiniteScroll('.infinite-scroll-' + tempID);

		// Attach 'infinite' event handler
		$('.infinite-scroll-' + tempID).on('infinite', function () {

			// Exit, if loading in progress
			if (window.globals.state.infiniteScrollLoading) return;

			// Set loading flag
			window.globals.state.infiniteScrollLoading = true;

			// Emulate 1s loading
			setTimeout(function () {
				// Reset loading flag
				window.globals.state.infiniteScrollLoading = false;
				var page = window.globals.temp[tempID];

				if (page.infiniteScroll.endReached) {
					// Nothing more to load, detach infinite scroll events to prevent unnecessary loadings
					expApp.detachInfiniteScroll('.infinite-scroll-' + tempID);
					// Remove preloader
					$('.infinite-scroll-' + tempID + ' .infinite-scroll-preloader').remove();
					return;
				}

				updateItemList($(page.container).find('#expenses-list-category').val(), tempID, false);
			}, 100);
		});

		updateItemList(0, tempID, true);
	});

	//////////////////////////////////////////////////////////////////
	// settings                                                     //
	//////////////////////////////////////////////////////////////////
	expApp.onPageInit('settings', function (page) {

		// load settings
		var settings = getSettings();

		console.log(settings);

		$('#settings-ui_money_format').find('option[value="' + settings['ui_money_format'] + '"]').attr('selected', 'selected');

		if (settings['sync_enabled']) $('#settings-sync_enabled').prop('checked', 'checked');

		if (settings['sync_startup']) $('#settings-sync_startup').prop('checked', 'checked');

		// SAVE HANDLERS
		// change handler: ui_money_format
		$('#settings-ui_money_format').on('change', function () {
			setSettings('ui_money_format', $('#settings-ui_money_format').val());
			console.log(getSettings('ui_money_format'));
		});
		// change handler: sync_enabled
		$('#settings-sync_enabled').on('change', function () {
			setSettings('sync_enabled', $('#settings-sync_enabled').is(':checked'));
			console.log(getSettings('sync_enabled'));
		});
		// change handler: sync_startup
		$('#settings-sync_startup').on('change', function () {
			setSettings('sync_startup', $('#settings-sync_startup').is(':checked'));
			console.log(getSettings('sync_startup'));
		});
	});

	//////////////////////////////////////////////////////////////////
	// settings-categories                                          //
	//////////////////////////////////////////////////////////////////
	expApp.onPageInit('settings-categories', function (page) {

		createCategoryListElements('#settings-categories-list');

		// Sortable toggler
		$$('.list-block.sortable').on('open', function (e) {

			// trigger events only when targeted on sorting list (prevent action when swiping on list elements)
			if ($(e.target).hasClass('sortable')) {

				$$('.toggle-sortable i').addClass('icon-ion-ios7-checkmark-outline').removeClass('icon-ion-ios7-drag');
				$('#settings-categories-list label.label-checkbox').removeClass('disabled');
			}
		});
		$$('.list-block.sortable').on('close', function (e) {

			// trigger events only when targeted on sorting list (prevent action when swiping on list elements)
			if ($(e.target).hasClass('sortable')) {

				$$('.toggle-sortable i').addClass('icon-ion-ios7-drag').removeClass('icon-ion-ios7-checkmark-outline');
				$('#settings-categories-list label.label-checkbox').addClass('disabled');

				// save list and its order
				$('#settings-categories-list li').each(function (index) {

					if ($(this).is('[data-uniqueid]')) {

						var catID = $(this).attr('data-uniqueid');
						var newDisabled = !$(this).find('#cat-' + catID).is(':checked');
						var newOrder = index + 1;

						db.update('category', { uniqueid: catID }, function (row) {
							row.disabled = newDisabled;
							row.order = newOrder;
							row.synchronized = false;
							row.lastupdate = Date.now();
							return row;
						});
					}
				});
			}
		});
	});

	//////////////////////////////////////////////////////////////////
	// settings-accounts                                            //
	//////////////////////////////////////////////////////////////////
	expApp.onPageInit('settings-accounts', function (page) {

		createAccountListElements('#settings-accounts-list');

		// Sortable toggler
		$$('.list-block.sortable').on('open', function (e) {

			// trigger events only when targeted on sorting list (prevent action when swiping on list elements)
			if ($(e.target).hasClass('sortable')) {

				$$('.toggle-sortable i').addClass('icon-ion-ios7-checkmark-outline').removeClass('icon-ion-ios7-drag');
				$('#settings-accounts-list label.label-checkbox').removeClass('disabled');
			}
		});
		$$('.list-block.sortable').on('close', function (e) {

			// trigger events only when targeted on sorting list (prevent action when swiping on list elements)
			if ($(e.target).hasClass('sortable')) {

				$$('.toggle-sortable i').addClass('icon-ion-ios7-drag').removeClass('icon-ion-ios7-checkmark-outline');
				$('#settings-accounts-list label.label-checkbox').addClass('disabled');

				// save list and its order
				$('#settings-accounts-list li').each(function (index) {

					if ($(this).is('[data-uniqueid]')) {

						var catID = $(this).attr('data-uniqueid');
						var newDisabled = !$(this).find('#cat-' + catID).is(':checked');
						var newOrder = index + 1;

						db.update('account', { uniqueid: catID }, function (row) {
							row.disabled = newDisabled;
							row.order = newOrder;
							row.synchronized = false;
							row.lastupdate = Date.now();
							return row;
						});
					}
				});

				// recalculate the total balance on index page
				// because disabling/enabling accounts influences the total balance
				pageIndex.trigger();
			}
		});
	});

	//////////////////////////////////////////////////////////////////
	// backup                                                       //
	//////////////////////////////////////////////////////////////////
	expApp.onPageInit('backup', function (page) {

		// assume main view if page is not defined
		page = page || { container: '.view-main' };

		// csv export button
		$(page.container).find('a#export-csv').on('click', function () {
			// detect table name for export (which data shall be exported?)
			var tableName = $(page.container).find('#export-table').val();

			var encodedUri = createCSVDataLink(tableName, db.query(tableName), "ExpenSync CSV Export " + Date.now());

			if (encodedUri) {
				var link = document.createElement("a");
				link.setAttribute("href", encodedUri);
				link.setAttribute("download", "expensync_export_" + Date.now() + ".csv");
				link.setAttribute("class", "external");
				document.body.appendChild(link);
				link.click();
			} else {
				expApp.alert('No data was found for export.');
			}
		});

		// text csv export button
		$(page.container).find('a#export-text-csv').on('click', function () {
			// detect table name for export (which data shall be exported?)
			var tableName = $(page.container).find('#export-table').val();

			$('.popup-general .popup-title').html('CSV Export');
			$('.popup-general .page-content').html('<div class="content-block-title">Text content</div>' + '<div class="list-block">' + '<ul>' + '<li class="align-top">' + '<div class="item-content">' + '<div class="item-inner">' + '<div class="item-input">' + '<textarea style="height: 300px">' + createCSVDataLink(tableName, db.query(tableName), "ExpenSync CSV Export " + Date.now(), true) + '</textarea>' + '</div>' + '</div>' + '</div>' + '</li>' + '</ul>' + '</div>');
			expApp.popup('.popup-general');
		});

		// text json export button
		$(page.container).find('a#export-text-json').on('click', function () {
			// detect table name for export (which data shall be exported?)
			var tableName = $(page.container).find('#export-table').val();

			$('.popup-general .popup-title').html('JSON Export');
			$('.popup-general .page-content').html('<div class="content-block-title">Text content</div>' + '<div class="list-block">' + '<ul>' + '<li class="align-top">' + '<div class="item-content">' + '<div class="item-inner">' + '<div class="item-input">' + '<textarea style="height: 300px">' + JSON.stringify(db.query(tableName)) + '</textarea>' + '</div>' + '</div>' + '</div>' + '</li>' + '</ul>' + '</div>');
			expApp.popup('.popup-general');
		});

		// json import button
		$(page.container).find('a#form-import-json-submit').on('click', function (e) {

			e.preventDefault();

			// disable multiple inputs in short time
			if (!window.globals.state.blockedInput) {

				// disable button to prevent multiple entries (by accident)
				that = $(e.target);
				that.addClass('disabled');
				window.globals.state.blockedInput = true;
				window.setTimeout(function () {
					that.removeClass('disabled');
					window.globals.state.blockedInput = false;
				}, 1000);

				var importData = JSON.parse($(page.container).find('#form-import-json-data').val());
				var importTableName = $(page.container).find('#form-import-table').val();
				var importStats = {
					updated: 0,
					created: 0
				};

				if (!!importData && Array.isArray(importData)) {
					importData.forEach(function (row) {

						// in legacy data sets, the ID is included in a single row
						delete row.ID;

						// as this was not implemented yet in multideviceDatabase ...
						//db.insertOrUpdate(importTableName, {uniqueid: row.uniqueid}, row);

						// ... taking this approach
						var rowExists = db.queryAll(importTableName, { query: { uniqueid: row.uniqueid } });
						console.debug("rowExists", rowExists, row.uniqueid, row.description);
						rowExists = rowExists.length === 1;
						if (rowExists) {
							db.update(importTableName, { uniqueid: row.uniqueid }, function (oldRow) {
								// overwrite, dropping old row
								return $.extend(oldRow, row);
							});
							importStats.updated += 1;
						} else {
							db.insert(importTableName, row);
							importStats.created += 1;
						}
					});
				}

				expApp.alert('The data import into <strong>' + importTableName + '</strong> was completed. Updated <strong>' + importStats.updated + '</strong> existing entries, created <strong>' + importStats.created + '</strong> new entries.', 'Import completed');
			}
		});
	});

	//////////////////////////////////////////////////////////////////
	// stats                                                        //
	//////////////////////////////////////////////////////////////////
	expApp.onPageInit('stats', function (page) {

		var disabledAccounts = [];
		var categories = [];
		var accounts = [];

		var allAccounts = getAccounts();
		var accountSum = 0;
		allAccounts.forEach(function (account) {
			accounts[account.uniqueid] = account.description;
			if (account.disabled) disabledAccounts.push(account.uniqueid);else accountSum += account.initial_balance;
		});

		var data = db.queryAll('item', {
			query: function query(row) {
				if (!row.deleted && disabledAccounts.indexOf(row.account) === -1) return true;else return false;
			}
		});
		var dataCategory = db.query('category');

		dataCategory.forEach(function (c) {
			categories[c.uniqueid] = c.description;
		});

		var runningTotal = accountSum;
		data.sort(function (a, b) {
			return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
		});
		data.forEach(function (d) {
			d.timestamp = new Date(d.timestamp);
			d.monthYear = d3.time.format("%Y/%m").parse(d.timestamp.getFullYear() + '/' + (d.timestamp.getMonth() + 1));

			runningTotal += d.price;
			d.runningTotal = runningTotal;
		});

		// reduce functions for running total
		function reduceAdd(p, v) {
			p.total += v.price;
			p.count++;
			p.average = p.total / p.count;
			return p;
		}
		function reduceRemove(p, v) {
			p.total -= v.price;
			p.count--;
			p.average = p.total / p.count;
			return p;
		}
		function reduceInitial() {
			return {
				total: 0,
				count: 0,
				average: 0
			};
		}

		var facts = crossfilter(data);
		var all = facts.groupAll();

		var dateDim = facts.dimension(dc.pluck('monthYear'));
		var dateTotal = dateDim.group().reduceSum(dc.pluck('price'));
		var minDate = dateDim.bottom(1)[0].timestamp;
		var maxDate = dateDim.top(1)[0].timestamp;

		//facts.groupAll();
		var fullDateDim = facts.dimension(dc.pluck('timestamp'));
		var averageGroup = fullDateDim.group().reduce(reduceAdd, reduceRemove, reduceInitial);
		var runningTotalGroup = fullDateDim.group().reduceSum(dc.pluck('runningTotal'));

		facts.groupAll();
		var categoryDim = facts.dimension(dc.pluck('category'));
		var categoryTotalMinus = categoryDim.group().reduceSum(function (d) {
			if (d.price < 0) return d.price;else return 0;
		});
		var categoryTotalPlus = categoryDim.group().reduceSum(function (d) {
			if (d.price > 0) return d.price;else return 0;
		});
		var categoryTotalMinusSum = categoryDim.groupAll().reduceSum(function (d) {
			if (d.price < 0) return d.price;else return 0;
		});
		var categoryTotalPlusSum = categoryDim.groupAll().reduceSum(function (d) {
			if (d.price > 0) return d.price;else return 0;
		});

		facts.groupAll();
		var accountDim = facts.dimension(dc.pluck('account'));
		var accountTotalMinus = accountDim.group().reduceSum(function (d) {
			if (d.price < 0) return d.price;else return 0;
		});
		var accountTotalPlus = accountDim.group().reduceSum(function (d) {
			if (d.price > 0) return d.price;else return 0;
		});
		var accountTotalMinusSum = accountDim.groupAll().reduceSum(function (d) {
			if (d.price < 0) return d.price;else return 0;
		});
		var accountTotalPlusSum = accountDim.groupAll().reduceSum(function (d) {
			if (d.price > 0) return d.price;else return 0;
		});

		// count all the facts and print out the data counts
		dc.dataCount(".dc-data-count").dimension(facts).group(all);

		var monthChart = dc.barChart('#dc-month-chart');
		var trendChart = dc.compositeChart('#dc-trend-chart');
		var categoryMinusChart = dc.rowChart('#dc-category-minus-chart');
		var categoryPlusChart = dc.rowChart('#dc-category-plus-chart');
		var categoryMinusPieChart = dc.pieChart('#dc-category-minus-pie-chart');
		var categoryPlusPieChart = dc.pieChart('#dc-category-plus-pie-chart');
		var accountMinusPieChart = dc.pieChart('#dc-account-minus-pie-chart');
		var accountPlusPieChart = dc.pieChart('#dc-account-plus-pie-chart');
		var dataTable = dc.dataTable('#dc-data-table');

		var monthScale = d3.time.scale();
		monthScale.domain([minDate, maxDate]);

		var categoryTitleFunction = function categoryTitleFunction(d) {
			var sum = d.value > 0 ? categoryTotalPlusSum : categoryTotalMinusSum;
			return categories[d.key] + ': ' + getFormattedPrice(Math.round(d.value * 100) / 100) + ' (' + Math.round(d.value / sum.value() * 1000) / 10 + ' %)';
		};
		var accountTitleFunction = function accountTitleFunction(d) {
			var sum = d.value > 0 ? accountTotalPlusSum : accountTotalMinusSum;
			return accounts[d.key] + ': ' + getFormattedPrice(Math.round(d.value * 100) / 100) + ' (' + Math.round(d.value / sum.value() * 1000) / 10 + ' %)';
		};
		var updateTotals = function updateTotals() {
			$('.dc-category-total-minus-sum').text(getFormattedPrice(categoryTotalMinusSum.value()));
			$('.dc-category-total-plus-sum').text(getFormattedPrice(categoryTotalPlusSum.value()));
			$('#dc-account-total-minus-sum').text(getFormattedPrice(accountTotalMinusSum.value()));
			$('#dc-account-total-plus-sum').text(getFormattedPrice(accountTotalPlusSum.value()));
		};

		monthChart.width(function () {
			return $('#dc-month-chart').width();
		}).height(200).margins({ left: 35, right: 30, top: 20, bottom: 20 }).dimension(dateDim).group(dateTotal).x(monthScale).xUnits(d3.time.months).elasticX(true).elasticY(true).colors(d3.scale.ordinal().domain(["positive", "negative"]).range(["#4cd964", "#ff3b30"])).colorAccessor(function (d) {
			if (d.value > 0) return "positive";
			return "negative";
		}).brushOn(true).round(d3.time.month.round).title(function (d) {
			return d.key.getMonth() + 1 + '/' + d.key.getFullYear() + ': ' + getFormattedPrice(Math.round(d.value * 100) / 100);
		}).on('renderlet', function (chart) {
			updateTotals();
		}).yAxis().ticks(4);

		trendChart.width(function () {
			return $('#dc-trend-chart').width();
		}).height(200).margins({ left: 35, right: 30, top: 20, bottom: 20 }).dimension(fullDateDim).brushOn(false).elasticX(true).elasticY(true).title(function (d) {
			var title = d.key.getDay() + '.' + (d.key.getMonth() + 1) + '.' + d.key.getFullYear() + ':';
			if (_typeof(d.value) === 'object') title += ' expense for this day ' + parseFloat(d.value.total).toFixed(2);else title += ' overall total balance ' + parseFloat(d.value).toFixed(2);
			return title;
		}).renderHorizontalGridLines(true).x(d3.time.scale()).legend(dc.legend().x(40).y(20).gap(10)).compose([dc.lineChart(trendChart).ordinalColors(['#ff9500']).group(averageGroup, 'Daily expense').valueAccessor(function (d) {
			return d.value.average;
		}), dc.lineChart(trendChart).ordinalColors(['#4cd964']).group(runningTotalGroup, 'Total balance')]).yAxis().ticks(4);

		categoryMinusChart.width(function () {
			return $('#dc-category-minus-chart').width();
		}).height(500).margins({ left: 30, right: 30, top: 20, bottom: 20 }).dimension(categoryDim).group(categoryTotalMinus).label(function (d) {
			return categories[d.key];
		}).title(categoryTitleFunction).elasticX(true).xAxis().ticks(4);

		categoryPlusChart.width(function () {
			return $('#dc-category-plus-chart').width();
		}).height(500).margins({ left: 30, right: 30, top: 20, bottom: 20 }).dimension(categoryDim).group(categoryTotalPlus).label(function (d) {
			return categories[d.key];
		}).title(categoryTitleFunction).elasticX(true).xAxis().ticks(4);

		categoryMinusPieChart.width(function () {
			return $('#dc-category-minus-pie-chart').width();
		}).height(300).radius(115).dimension(categoryDim).group(categoryTotalMinus).label(function (d) {
			return '';
		}).title(categoryTitleFunction);
		categoryMinusPieChart.onClick = function () {};

		categoryPlusPieChart.width(function () {
			return $('#dc-category-plus-pie-chart').width();
		}).height(300).radius(115).dimension(categoryDim).group(categoryTotalPlus).label(function (d) {
			return '';
		}).title(categoryTitleFunction);
		categoryPlusPieChart.onClick = function () {};

		accountMinusPieChart.width(function () {
			return $('#dc-account-minus-pie-chart').width();
		}).height(300).radius(115).dimension(accountDim).group(accountTotalMinus).label(function (d) {
			return '';
		}).title(accountTitleFunction);

		accountPlusPieChart.width(function () {
			return $('#dc-account-plus-pie-chart').width();
		}).height(300).radius(115).dimension(accountDim).group(accountTotalPlus).label(function (d) {
			return '';
		}).title(accountTitleFunction);

		dataTable.dimension(dateDim).group(function (d) {
			return d.timestamp.getFullYear() + ' / ' + ('0' + (d.timestamp.getMonth() + 1)).slice(-2);
		}).size(25).order(d3.descending).columns([{
			label: 'Date',
			format: function format(d) {
				var formattedDate = ('0' + d.timestamp.getDate()).slice(-2) + '.' + ('0' + (d.timestamp.getMonth() + 1)).slice(-2) + '.' + d.timestamp.getFullYear() + ' ' + ('0' + d.timestamp.getHours()).slice(-2) + ':' + ('0' + d.timestamp.getMinutes()).slice(-2);
				return formattedDate;
			}
		}, {
			label: 'Category',
			format: function format(d) {
				return categories[d.category];
			}
		}, {
			label: 'Description',
			format: function format(d) {
				return d.description;
			}
		}, {
			label: 'Price',
			format: function format(d) {
				return parseFloat(d.price).toFixed(2);
			}
		}]);

		dc.renderAll();
	});

	//////////////////////////////////////////////////////////////////
	// APPLICATION STARTUP                                          //
	//////////////////////////////////////////////////////////////////

	// finally initialize app
	expApp.init();

	// check if database is from current app version, and ask for update
	/*if ( getSettings('sync_enabled') && (db.query('settings', {key: 'db_version'}).length == 0 || window.globals.properties.version != getSettings('db_version')) )
 	expApp.alert(
 		'The version of ExpenSync is newer than your local database. You must update your local database in order to prevent errors and enable new features.<br>' +
 		'For this, go to settings menu and click "drop local database". Synchronize your data with Dropbox before doing this, or your data will be lost!',
 		'New version available'
 	);*/

	// check if dropbox sync on startup is enabled TODO
	//if ( getSettings('sync_enabled') && getSettings('sync_startup') )
	//	syncInit();

	// debug output of DB content if debug is enabled
	if (window.globals.properties.debug) console.debug("DB content: ", JSON.parse(db.serialize()));

	// Firefox install button
	var button = document.getElementById('button-install-firefox');

	if (navigator && navigator.mozApps) {
		var manifest_url;
		var installCheck;

		(function () {
			var install = function install(ev) {
				ev.preventDefault();
				//Manifest URL Definieren
				// App Installieren
				var installLocFind = navigator.mozApps.install(manifest_url);
				installLocFind.onsuccess = function (data) {
					// Wenn die App Installiert ist
					expApp.alert('ExpenSync was successfully installed!');
				};
				installLocFind.onerror = function () {
					// App ist nicht Installiert
					// installapp.error.name
					expApp.alert(installLocFind.error.name);
				};
			};

			manifest_url = location.href + 'manifest.webapp';
			;

			installCheck = navigator.mozApps.checkInstalled(manifest_url);


			installCheck.onsuccess = function () {
				if (installCheck.result) {
					button.style.display = "none";
				} else {
					button.addEventListener('click', install, false);
				};
			};
		})();
	} else {
		button.style.display = "none";
	}
} // end initApp()