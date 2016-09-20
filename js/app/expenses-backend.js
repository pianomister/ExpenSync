/***********************************
 * ExpenSync                       *
 *                                 *
 * EXPENSES-BACKEND.JS             *
 * Backend functions working with  *
 * data and database only          *
 ***********************************/


window.i18n = {

	month: [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December"
	],

	weekday: [
		"Sunday",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday"
	]

}

window.globals = {

	properties: {
		version: '0.3.1',
		appname: 'ExpenSync',
		appkey: 'z0bumu7k3mv0nu3',
		developer: 'Stephan Giesau',
		website: 'http://www.stephan-giesau.de/',
		debug: false
	},
	icons: [
		'icon-ion-ios7-more',
		'icon-ion-ios7-cart',
		'icon-ion-fork',
		'icon-ion-ios7-wineglass',
		'icon-ion-ios7-musical-notes',
		'icon-ion-ios7-pricetags',
		'icon-ion-model-s',
		'icon-ion-plane',
		'icon-ion-map',
		'icon-ion-ios7-home',
		'icon-ion-ios7-briefcase',
		'icon-ion-cash',
		'icon-ion-ios7-medkit',
		'icon-ion-university',
		'icon-ion-ios7-home',
		'icon-ion-ios7-telephone',
		'icon-smile-o',
		'icon-frown-o',
		'icon-meh-o',
		'icon-code',
		'icon-question',
		'icon-info',
		'icon-anchor',
		'icon-euro',
		'icon-gbp',
		'icon-dollar',
		'icon-child',
		'icon-ion-bag',
		'icon-ion-beer',
		'icon-ion-card',
		'icon-ion-document-text',
		'icon-ion-earth',
		'icon-ion-female',
		'icon-ion-game-controller-b',
		'icon-ion-hammer',
		'icon-ion-icecream',
		'icon-ion-ios7-alarm',
		'icon-ion-ios7-albums',
		'icon-ion-ios7-americanfootball',
		'icon-ion-ios7-baseball',
		'icon-ion-ios7-bell',
		'icon-ion-ios7-bolt',
		'icon-ion-ios7-bookmarks',
		'icon-ion-ios7-box',
		'icon-ion-ios7-calendar',
		'icon-ion-ios7-camera',
		'icon-ion-ios7-chatboxes',
		'icon-ion-ios7-chatbubble',
		'icon-ion-ios7-checkmark-outline',
		'icon-ion-ios7-cloud',
		'icon-ion-ios7-cloudy-night',
		'icon-ion-ios7-contact-outline',
		'icon-ion-ios7-copy',
		'icon-ion-ios7-drag',
		'icon-ion-ios7-email',
		'icon-ion-ios7-filing',
		'icon-ion-ios7-flag',
		'icon-ion-ios7-folder',
		'icon-ion-ios7-football-outline',
		'icon-ion-ios7-gear-outline',
		'icon-ion-ios7-glasses',
		'icon-ion-ios7-heart',
		'icon-ion-ios7-lightbulb',
		'icon-ion-ios7-location',
		'icon-ion-ios7-locked',
		'icon-ion-ios7-mic',
		'icon-ion-ios7-monitor',
		'icon-ion-ios7-paper',
		'icon-ion-ios7-paperplane',
		'icon-ion-ios7-partlysunny',
		'icon-ion-ios7-paw',
		'icon-ion-ios7-people',
		'icon-ion-ios7-person',
		'icon-ion-ios7-pie',
		'icon-ion-ios7-printer',
		'icon-ion-ios7-pulse-strong',
		'icon-ion-ios7-rainy',
		'icon-ion-ios7-search-strong',
		'icon-ion-ios7-snowy',
		'icon-ion-ios7-star',
		'icon-ion-ios7-sunny',
		'icon-ion-ios7-time',
		'icon-ion-ios7-trash',
		'icon-ion-ios7-unlocked',
		'icon-ion-ios7-videocam',
		'icon-ion-ipad',
		'icon-ion-iphone',
		'icon-ion-ipod',
		'icon-ion-jet',
		'icon-ion-key',
		'icon-ion-knife',
		'icon-ion-laptop',
		'icon-ion-leaf',
		'icon-ion-mouse',
		'icon-ion-music-note',
		'icon-ion-no-smoking',
		'icon-ion-pizza',
		'icon-ion-playstation',
		'icon-ion-social-dropbox',
		'icon-ion-social-usd',
		'icon-ion-stats-bars',
		'icon-ion-wifi',
		'icon-ion-woman',
		'icon-ion-wrench',
		'icon-directions',
		'icon-feather',
		'icon-flashlight',
		'icon-tools',
		'icon-droplet',
		'icon-hourglass',
		'icon-cup',
		'icon-rocket',
		'icon-brush',
		'icon-keyboard',
		'icon-database',
		'icon-clipboard',
		'icon-graph',
		'icon-archive'
	],
	static: {
		infiniteScrollItemsPerLoad: 20
	},
	state: { // to save globally accessible application state variables
		blockedInput: false,
		infiniteScrollLoading: false
	},
	temp: {} // to save objects used temporarily, e.g. from expenses lists

}



/**
* creates initial local database
*/
function createLocalDatabase() {

	// create 'settings' table
	var settings_rows = [
		{key: 'db_version', value: window.globals.properties.version, description: 'Version of created database'},
		{key: 'ui_lang', value: 'EN', description: 'Language'},
		{key: 'ui_money_format', value: 'comma', description: 'Money Format'},
		{key: 'ui_months_shown', value: 6, description: 'Number of months shown'},
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

	for (var k = 0; k < _categories.length; k++) {

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
}



/**
 * delete local database on confirmation
 */
function deleteLocalDatabase() {

	expApp.confirm(
		//'Do you really want to drop the local database? All local data (expenses, settings) will be lost.',
		'This functionality is not available yet.',
		//'Delete Database',
		'OK',
		function () {

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
	if (settingName)
		query = {key: settingName};

	var props = db.query('settings', query);
	var propsAll = db.query('settings', null);//TODO delete

	if (query) {

		return props[0].value;
	} else {

		var returnObject = {};
		for (i = 0; i < props.length; i++) {

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

	if (newValue !== undefined) {

		settings = [{ key: settings, value: newValue }];
	}

	if (settings) {

		for (i = 0; i < settings.length; i++) {

			db.update('settings',
					{key: settings[i].key},
					function (row) {
						row.value = settings[i].value;
						return row;
					}
				);
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

	if (!(iconID === 0) )
		iconID = iconID || false;

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
	if (accountID)
		query = {uniqueid: accountID};

	var accs = db.queryAll('account', {'query': query, 'sort': [['order', 'ASC']]});

	if (query) {

		return accs[0];
	} else {

		var returnArray = [];
		for (i = 0; i < accs.length; i++) {

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
	for (var i = 0; i < allAccounts.length; i++) {
		disabledAccounts.push(allAccounts[i].uniqueid);
	}

	// get not-deleted items from enabled accounts
	var returnItems = db.queryAll('item', {
			query: function (row) {
				if (!row.deleted &&
					row.timestamp >= startDate &&
					row.timestamp < endDate &&
					disabledAccounts.indexOf(row.account) === -1)
					return true;
				else
					return false;
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
		var local =	db.query(table, {uniqueid: items[i].uniqueid});

		if (items[i].lastupdate >= timestamp && (local.length == 0 || local[0].lastupdate <= timestamp) ) {

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

	if (data.length == 0)
		return false;

	CSV += data;

	// initialize file format you want csv or xls
	if (!noLink)
		CSV = 'data:text/csv;charset=utf-8,' + escape(CSV);

	return CSV;
}

/**
 * convert JSON object to CSV
 */
function convertJSONtoCSV(JSONData) {
	// if JSONData is not an object then JSON.parse will parse the JSON string in an Object
	var arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;
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
