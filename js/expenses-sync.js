// expenses-sync.js

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
console.log('syncSetup');//TODO
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

					sync();
				}
			});
		} else {
			console.log('syncSetup/else');
			sync();
		}

	} else {
		expApp.hidePreloader();
		expApp.alert('Sync failed because you are not authenticated with Dropbox yet.');
	}
}

// close datastore manager and stop sync TODO not needed?
function syncClose() {

	//client.getDatastoreManager().close();
	//ds.close();
	//ds = null;
	//dsTable = null;
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

	console.log('sync');//TODO

	// get data
	var syncTable = dsTable.getOrInsert('sync', {name:'items',json:'[]'});
	var syncJSON = JSON.parse( syncTable.get('json') );

	// if data available in datastore, merge it and save it back
	if(syncJSON.length > 0) {

		var lastSync = getSettings('sync_lastupdate');

		console.log('getSyncTime(): ', getSyncTime().getTime(), lastSync, lastSync < getSyncTime() );//TODO

		// server has newer data, merge server data to local DB and update server
		if(lastSync < getSyncTime().getTime() ) {

			var merge_input = getItemsNewerThan(syncJSON, lastSync);

			console.log('Merge input: ' + merge_input);//TODO

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
					row.lastupdate
					row.synchronized = true;
					return row;
				}
			);

			db.commit();

		} else {

			//expApp.hidePreloader();
			//expApp.alert('Everything is up to date.');//TODO does never show up
			console.log('Everything is up to date.');//TODO
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

	// close connection
	syncClose(); //TODO

	// update local sync timestamp
	setSettings('sync_lastupdate', Date.now() );

	//trigger refresh of menu and main page
	if(merge_input && merge_input.length > 0) {

		pageIndexLeft.trigger();
		pageIndex.trigger();
		//mainView.loadPage('index.html');
	}

	expApp.hidePreloader();
}
