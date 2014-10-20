//expenses-backend.js


/**
 * delete local database on confirmation
 */
function deleteLocalDatabase() {

	expApp.confirm(
		'Do you really want to drop the local database? All local data (expenses, settings) will be lost.',
		'Delete Database',
		function() {
	
			db.drop();
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

	settingName = settingName || null;
	
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

	newValue = newValue || null;
	
	if(newValue) {
	
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
 * get all items with lastupdate timestamp newer than given timestamp in params
 * 
 * @param {Array<Object>} items array of items with "lastupdate" property
 * @param {timestamp/int} timestamp time limit, all newer entries will be returned
 *
 * @returns {Array<Object>} array of all items with "lastupdate" newer than given timestamp
 */
function getItemsNewerThan(items, timestamp) {

	var result = [];
	
	for(i = 0; i < items.length; i++) {
	
		// for check if local is not newer
		var local =	db.query('item', {uniqueid: items[i].uniqueid});
	
		if(items[i].lastupdate >= timestamp && (local.length == 0 || local[0].lastupdate <= timestamp) ) {
		
			result.push(items[i]);
		}
	}
	
	return result;
}