
class File {

  constructor(fileName, client) {
    this.fileName = fileName;
    //this.sync = bind(this.sync, this);
    this.syncing = false;
    this.syncingAddedData = null;
    this.timeExtension = 0;
    this.timeLastRead = 0;
    this.fileStats = null;
    this.dataObject = {};
    this.client = client;
  }

  query(param) {
    return this.toDataArray(this.queryHelper(param));
  }

  queryHelper(param) {
    if (typeof param === "function") {
      return this.queryByFunction(param);
    } else if (param == null) {
      return this.dataObject;
    } else {
      return this.queryByValue(param);
    }
  }

  remove(param) {
    var key, result;
    this.scheduleSync();
    result = this.queryHelper(param);
    for (key in result) {
      if (!result.hasOwnProperty(key)) continue;
      delete this.dataObject[key];
    }

    return this.query(param);
  }

  update(param, values) {
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

  insert(data) {
    this.scheduleSync();
    var nid = this.getNextId();

    return this.dataObject[nid] = data;
  }

  queryByFunction(func) {
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

  queryByValue(params) {
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

  getNextId() {
    var increment, time;
    time = (new Date()).getTime();
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

  scheduleSync() {
    if (!this.syncing) {
      this.syncing = true;
      return setTimeout(() => { this.sync() }, 0);
    }
  }

  sync() {
    var oldVersionTag, time;
    this.syncing = false;
    time = (new Date()).getTime();
    oldVersionTag = "0";

    if (this.fileStats != null) {
      oldVersionTag = this.fileStats.versionTag;
    }

    return this.readStat(() => {
        var oldData;
        if (oldVersionTag !== this.fileStats.versionTag) {
          oldData = this.clone(this.dataObject);
          return this.readFile(() => {
            this.dataObject = this.merge(oldData, this.dataObject);
            this.timeLastRead = time;
            return this.writeFile();
          });
        }
      });
  }

  getVersionTag() {
    return this.fileStats.versionTag;
  }

  getSize() {
    var syncingLength;
    syncingLength = 0;
    if (this.syncingAddedData != null) {
      syncingLength = JSON.stringify(this.syncingAddedData).length;
    }

    return JSON.stringify(this.dataObject).length + syncingLength;
  }

  getName() {
    return this.fileName;
  }

  getData() {
    return this.clone(this.dataObject);
  }

  getDataArray() {
    return this.toDataArray(this.dataObject);
  }

  toDataArray(object) {
    var array, key;
    array = [];
    for (key in object) {
      array.push(object[key]);
    }
    return this.clone(array);
  }

  readFile(callback) {
    return this.client.readFile(this.fileName, (err, data, stats) => {
        if (this.error(err, callback)) {
          this.dataObject = JSON.parse(data);
          this.fileStats = stats;
          return this.call(callback);
        }
      });
  }

  writeFile(callback) {
    return this.client.writeFile(this.fileName, JSON.stringify(this.dataObject), (err, stats) => {
        var file_stats;
        if (this.error(err, callback)) {
          file_stats = stats;
          return this.call(callback);
        }
      });
  }

  readStat(callback) {
    return this.client.stat(this.fileName, (err, stats) => {
        if (this.error(err, callback)) {
          this.fileStats = stats;
          return this.call(callback);
        }
      });
  }

  error(err, callback) {
    var result;
    result = true;
    if (err != null) {
      switch (err.status) {
        case 404:
          result = false;
          console.log("File not found - creating new file");
          this.writeFile(callback);
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

  merge(objA, objB) {
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
   * Helper function to create a clone of given object,
   * using JSON string convertion as a hack.
   */
  clone(obj) {
    var str = JSON.stringify(obj);
    return JSON.parse(str);
  }

  call(func) {
    return typeof func === "function" ? func() : void 0;
  }
}



class Table {

  // TODO callback with promise
  constructor(tableName, create, client, callbackOnLoad) {
    create = create || false;
    var file, tableFile;

    this.tableFileData = {};
    this.dataFileObjects = [];
    this.data = [];
    this.client = client;
    this.tableName = tableName; // TODO debug
    tableFile = new File(tableName, client);

    if (create) {
      tableFile.readFile();
      this.data[0] = {
        maxSize: 62500, // 62500 bytes = 50kB
        dataFiles: []
      };
      file = this.createNewDatafile();
      this.dataFileObjects.push(file);
      this.data[0].dataFiles.push(file.getName());
      tableFile.insert(this.data[0]);
      this.tableFileData = this.data[0];
      // TODO callback with promise on file creation
      call(callbackOnLoad);
    } else {
      tableFile.readFile(() => {
          var df, f, results;
          this.data = tableFile.getDataArray();
          this.tableFileData = this.data[0];
          results = [];

          for (df of this.tableFileData.data_files) {
            f = new File(df, this.client);
            this.dataFileObjects.push(f);
            // TODO callback with promise
            results.push(f.readFile(callbackOnLoad));
          }
          return results;
        });
    }
  }

  updateTableData() {
    var dataFile, dfo;
    dataFile = [];

    for (dfo of this.dataFileObjects) {
      dataFile.push(dfo.getName());
    }

    return tableFile.update(void 0, {
      'data_files': dataFiles
    });
  }

  insert(insertData) {
    var df = this.dataFileObjects[this.dataFileObjects.length - 1];

    if (df.getSize() > this.tableFileData.maxSize) {
      df = createNewDatafile();
      this.dataFileObjects.push(df);
      this.tableFileData.dataFiles.push(df.getName());
      this.updateTableData();
    }

    return df.insert(insertData);
  }

  query(queryString, sort) {
    var dfo, result, s;
    if (!queryString) {
      queryString = null;
    }
    if (!sort) {
      sort = null;
    }

//    console.debug("FileDB.query", this.tableName, queryString, sort);

    result = [];
    for (dfo of this.dataFileObjects) {
      result = result.concat(dfo.query(queryString));
    }

    if (sort != null && sort instanceof Array) {
      for (s of sort) {
        result.sort(this.sortResults(s[0], s[1]));
      }
    }

    return result;
  }

  createNewDatafile() {
    var file, name;
    name = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        var r, v;
        r = Math.random() * 16 | 0;
        v = c === 'x' ? r : r & 0x3 | 0x8;
        return v.toString(16);
      });

    file = new File("_" + name, this.client);
    file.readFile();

    return file;
  }

  sortResults(field, order) {
    if (!order) {
      order = null;
    }

    return (x, y) => {
        var a = x[field];
        var b = y[field];

        if (typeof a === "string") {
          a = a.toLowerCase();
        }

        if (typeof b === "string") {
          b = b.toLowerCase();
        }

        if (order === "DESC") {
          if (a === b) {
            return 0;
          } else if (a < b) {
            return 1;
          } else {
            return -1;
          }
        } else {
          if (a === b) {
            return 0;
          } else if (a > b) {
            return 1;
          } else {
            return -1;
          }
        }
      };
  }

  call(func) {
    return typeof func === "function" ? func() : void 0;
  }
}


class FileDB {

  constructor(apiKey) {
    this.apiKey = apiKey;
    this.allTables = {};

    this.joinCounter = 0;
    FileDB.file = File;
    this.client = null;
  }

  /**
   * initializes authentication to Dropbox API, and trigggers
   * loading of tables from Dropbox directory.
   */
  setupDropbox(callback) {
    this.client = new Dropbox.Client({
      "key": this.apiKey
    });

    this.client.authenticate(null, (error) => {
        if (!!error) {
          throw error;
        }
        this.loadTables(callback);
      });
  }

  /**
   * Simple data table query. Deprecated in localstoragedb,
   * use queryAll instead consistently.
   * @deprecated
   */
  query(tableName, queryString, sortArray) {
    // TODO "limit" parameter?
    if (!queryString) {
      queryString = null;
    }
    if (!sortArray) {
      sortArray = null;
    }
    return this.allTables[tableName].query(queryString, sortArray);
  }

  /**
   * Simple data table query.
   */
  queryAll(tableName, params) {
  	// TODO make syntax more readable ...
  	/*var argQuery, argSort, ref, ref1, ref2;
  	ref = arg != null ? arg : {
  	  argQuery: null,
  	  argSort: null
  	}, argQuery = (ref1 = ref.argQuery) != null ? ref1 : null, argSort = (ref2 = ref.argSort) != null ? ref2 : null;
  	  */

  	if (!params) {
  		return this.query(tableName);
  	} else {
  		return this.query(tableName,
  			params.hasOwnProperty('query') ? params.query : null,
        // TODO limit parameter
  			//params.hasOwnProperty('limit') ? params.limit : null,
  			params.hasOwnProperty('sort') ? params.sort : null
  		);
  	}
  }

  /**
   * Returns number of rows for given table.
   */
  rowCount(tableName) {
    return this.query(tableName).length;
  }

  /**
   * Creates a new table with given name.
   */
  createTable(tableName) {
    return this.allTables[tableName] = new Table(tableName, true, this.client);
  }

  /**
   * Creates a new table with given name, and fills in
   * given data as initial data set.
   */
  createTableWithData(tableName, data) {
    var d, i, len;
    this.createTable(tableName);
    for (i = 0, len = data.length; i < len; i++) {
      d = data[i];
      this.insert(tableName, d);
    }
    return this.query(tableName);
  }

  /**
   * Insert data row into given table.
   */
  insert(tableName, data) {
    return this.allTables[tableName].insert(data);
  }

  /**
   * Returns true if database was just created
   * with initialization of this instance.
   */
  isNew() {
    return Object.keys(this.allTables).length === 0;
  }

  /**
   * Load table data from Dropbox directory into
   * local memory, preparing the database for operations.
   */
  loadTables(callback) {
    return this.client.readdir("/", (error, files) => {
        var file;
        this.joinCounter++;
        for (file of files) {
          // files beginning with _ are containing data,
          // tables do have
          if (file[0] === "_") {
            continue;
          }
          this.joinCounter++;
          this.allTables[file] = new Table(file, false, this.client, () => {
            return this.join(callback);
          });
        }
        return this.join(callback);
      });
  }

  join(callback) {
    this.joinCounter--;
    if (this.joinCounter === 0) {
      return setTimeout(callback, 0);
    }
  }
}
