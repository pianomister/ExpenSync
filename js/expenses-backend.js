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



/**
* creates initial local database
*/
function createLocalDatabase() {

	// create 'settings' table
	var settings_rows = [
		{key: 'db_version', value: window.globals.properties.version, description: 'Version of created database'},
		{key: 'ui_lang', value: 'EN', description: 'Language'},
		{key: 'ui_money_format', value: 'comma', description: 'Money Format'},
		{key: 'sync_enabled', value: true, description: 'Sync enabled'},
		{key: 'sync_startup', value: false, description: 'Sync on startup'},
		{key: 'sync_continuous', value: true, description: 'Sync continuously or only manually'},
		{key: 'sync_lastupdate', value: 1, description: 'Timestamp of last sync'},
	];
	db.createTableWithData('settings', settings_rows);

	// create 'category' table
	db.createTable('category', ['uniqueid', 'timestamp', 'lastupdate', 'synchronized', 'description', 'icon', 'order', 'disabled']);

	var dateNow = Date.now();
	var _categories = ["Other", "Groceries", "Canteen", "Eating Out", "Fun", "Clothing", "Car", "Transport", "Travel", "Household", "Salary", "Finance", "Medical", "Education", "Rent / Loan", "Communication"];

	for(var k = 0; k < _categories.length; k++) {

		db.insert('category', {
			uniqueid: createUniqueid( k, k, true ),
			timestamp: 1,
			lastupdate: 1,
			synchronized: true,
			description: _categories[k],
			icon: k,
			order: k+1,
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

	db.commit();
}



/**
 * delete local database on confirmation
 */
function deleteLocalDatabase() {

	expApp.confirm(
		'Do you really want to drop the local database? All local data (expenses, settings) will be lost.',
		'Delete Database',
		function() {

			db.drop();
			db = new localStorageDB("expenSync", localStorage);
			createLocalDatabase();
			pageIndexLeft.trigger();
			pageIndex.trigger();
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
	if(settingName)
		query = {key: settingName};

	var props = db.query('settings', query);

	if(query) {

		return props[0].value;
	} else {

		var returnObject = {};
		for(i = 0; i < props.length; i++) {

			returnObject[ props[i].key ] = props[i].value;
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

	if(newValue !== undefined) {

		settings = [{ key: settings, value: newValue }];
	}

	if(settings) {

		for(i = 0; i < settings.length; i++) {

			db.update('settings',
					{key: settings[i].key},
					function(row) {
						row.value = settings[i].value;
						return row;
					}
				);
		}
		db.commit();
	}
}




/**
* get icon
*
* @param {int} iconID (optional) ID of icon. If not set, all icons are returned
* @returns icon CSS class or array with all icons
*/
function getIcons(iconID) {

	if(!(iconID === 0) )
		iconID = iconID || false;

	if(iconID || iconID === 0) {

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
	if(accountID)
		query = {uniqueid: accountID};

	var accs = db.query('account', query);

	if(query) {

		return accs[0];
	} else {

		var returnArray = [];
		for(i = 0; i < accs.length; i++) {

			returnArray.push( accs[i] );
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

	startDate = (new Date(startDate)).getTime();
	endDate = (new Date(endDate)).getTime();
	returnBalance = returnBalance || false;
	var disabledAccounts = [];

	// get all disabled accounts for item filtering
	var allAccounts = db.query('account', {disabled: true});
	for(var i = 0; i < allAccounts.length; i++) {
		disabledAccounts.push(allAccounts[i].uniqueid);
	}

	// get not-deleted items from enabled accounts
	var returnItems = db.queryAll('item', {
			query: function(row) {
				if(!row.deleted &&
					row.timestamp >= startDate &&
					row.timestamp < endDate &&
					disabledAccounts.indexOf(row.account) === -1)
					return true;
				else
					return false;
			}
		});

	// if only balance was requested
	if(returnBalance) {

		var returnPrice = 0;
		for(var i = 0; i < returnItems.length; i++) {
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

	for(var i = 0; i < items.length; i++) {

		// for check if local is not newer
		var local =	db.query(table, {uniqueid: items[i].uniqueid});

		if(items[i].lastupdate >= timestamp && (local.length == 0 || local[0].lastupdate <= timestamp) ) {

			result.push(items[i]);
		}
	}

	return result;
}



/**
 * separate a string str into chunks of given length len
 */
function chunkString(str, len) {
	var _size = Math.ceil(str.length/len),
	_ret  = new Array(_size),
	_offset
	;

	for (var _i=0; _i<_size; _i++) {
		_offset = _i * len;
		_ret[_i] = str.substring(_offset, _offset + len);
	}

	return _ret;
}
