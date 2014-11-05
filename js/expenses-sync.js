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

	if( getSettings('sync_enabled') ) {

		if(!window.client) {
			window.client = new Dropbox.Client({key: DROPBOX_APP_KEY});
		}

		// authentication
		window.client.authenticate(null, function(error) {
				if(error)
					expApp.alert(error);
				else
					syncSetup();
			});

	} else {
		expApp.hidePreloader();
		expApp.alert('Please enable sync in settings first before using it.');
	}
}



// after-authentication actions for sync setup
function syncSetup() {

	if(window.globals.properties.debug)
		console.log('syncSetup');

	if(window.client && window.client.isAuthenticated()) {

		// setup datastore
		if(!ds) {

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

					window.setTimeout(function(){ sync(); }, 1000);
				}
			});
		} else {
			if(window.globals.properties.debug)
				console.log('syncSetup/else');
			window.setTimeout(function(){ sync(); }, 1000);
		}

	} else {
		expApp.hidePreloader();
		expApp.alert('Sync failed because you are not authenticated with Dropbox yet.');
	}
}



function syncSignOut() {

	if(!window.client) {
		window.client = new Dropbox.Client({key: DROPBOX_APP_KEY});
	}

	// authentication
	window.client.authenticate(null, function(error) {
			if(error) {
				expApp.alert(error);
			} else {
				if( client.isAuthenticated() )
					client.signOut();
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

	if(window.globals.properties.debug)
		console.log('sync');

	var lastSync = getSettings('sync_lastupdate');


	////////////////////
	// item           //
	////////////////////

	// get data
	var syncTable = dsTable.getOrInsert('sync', {name:'items',json:'[]'});
	var syncJSON = JSON.parse( syncTable.get('json') );

	// if data available in datastore, merge it and save it back
	if(syncJSON.length > 0) {

		// server has newer data, merge server data to local DB and update server
		if(lastSync < getSyncTime().getTime() ) {

			var merge_input = getEntriesNewerThan(syncJSON, lastSync, 'item');

			if(window.globals.properties.debug)
				console.log('Merge input: ' + merge_input);

			for(i = 0; i < merge_input.length; i++) {

				db.insertOrUpdate('item',
						{uniqueid: merge_input[i].uniqueid},
						merge_input[i]
					);
			}

			// update timestamp on entries with 'synchronized = false'
			// so these entries are definitely synchronized to other clients
			db.update('item',
				{synchronized: false},
				function(row) {
					row.lastupdate = Date.now();
					row.synchronized = true;
					return row;
				}
			);

			db.commit();

		} else {

			if(window.globals.properties.debug)
				console.log('Everything is up to date.');
		}

	// if no data in datastore yet, insert local data
	} else {

		// see below
	}

	// update with local data
	dsTable.query({name:'items'})[0]
		.update({
			json: JSON.stringify( db.query('item') )
		});


	////////////////////
	// category       //
	////////////////////

	// get data
	var syncTable = dsTable.getOrInsert('category', {name:'category',json:'[]'});
	var syncJSON = JSON.parse( syncTable.get('json') );

	// if data available in datastore, merge it and save it back
	if(syncJSON.length > 0) {

		// server has newer data, merge server data to local DB and update server
		if(lastSync < getSyncTime().getTime() ) {

			var merge_input = getEntriesNewerThan(syncJSON, lastSync, 'category');

			if(window.globals.properties.debug)
				console.log('Merge input: ' + merge_input);

			for(i = 0; i < merge_input.length; i++) {

				db.insertOrUpdate('category',
						{uniqueid: merge_input[i].uniqueid},
						merge_input[i]
					);
			}

			// update timestamp on entries with 'synchronized = false'
			// so these entries are definitely synchronized to other clients
			db.update('category',
				{synchronized: false},
				function(row) {
					row.lastupdate = Date.now();
					row.synchronized = true;
					return row;
				}
			);

			db.commit();

		} else {

			if(window.globals.properties.debug)
				console.log('Everything is up to date.');
		}

	// if no data in datastore yet, insert local data
	} else {

		// see below
	}

	// update with local data
	dsTable.query({name:'category'})[0]
		.update({
			json: JSON.stringify( db.query('category') )
		});


	////////////////////
	// account        //
	////////////////////

	// get data
	var syncTable = dsTable.getOrInsert('account', {name:'account',json:'[]'});
	var syncJSON = JSON.parse( syncTable.get('json') );

	// if data available in datastore, merge it and save it back
	if(syncJSON.length > 0) {

		// server has newer data, merge server data to local DB and update server
		if(lastSync < getSyncTime().getTime() ) {

			var merge_input = getEntriesNewerThan(syncJSON, lastSync, 'account');

			if(window.globals.properties.debug)
				console.log('Merge input: ' + merge_input);

			for(i = 0; i < merge_input.length; i++) {

				db.insertOrUpdate('account',
						{uniqueid: merge_input[i].uniqueid},
						merge_input[i]
					);
			}

			// update timestamp on entries with 'synchronized = false'
			// so these entries are definitely synchronized to other clients
			db.update('account',
				{synchronized: false},
				function(row) {
					row.lastupdate = Date.now();
					row.synchronized = true;
					return row;
				}
			);

			db.commit();

		} else {

			if(window.globals.properties.debug)
				console.log('Everything is up to date.');
		}

	// if no data in datastore yet, insert local data
	} else {

		// see below
	}

	// update with local data
	dsTable.query({name:'account'})[0]
		.update({
			json: JSON.stringify( db.query('account') )
		});



	// update local sync timestamp
	setSettings('sync_lastupdate', Date.now() );

	// refresh views
	pageIndexLeft.trigger();
	pageIndex.trigger();
	expApp.hidePreloader();
}
