/***********************************
 * ExpenSync                       *
 *                                 *
 * EXPENSES-FRONTEND.JS            *
 * Frontend functions related to   *
 * UI logic and support            *
 ***********************************/

 // TODO fix issue with item update: time shifted +2 hours -> use moment.js

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
db.setupDropbox(() => {
	// Check if the database was just created. Then create all tables
	if ( db.isNew() ) {
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
	if (!noUserAgent)
		str += navigator.userAgent;

	return calcMD5( str );
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
	if (money_format === 'comma')
		price = price.replace('.', ',');

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
	if (price >= 0)
		colorClass = 'green';

	formattedPrice = getFormattedPrice(price);

	// account displayed below price
	// only if more than one account available
	var subtext = '';
	if (account) {

		account = getAccounts(account);

		if (account.disabled)
			colorClass = 'gray';

		if (db.rowCount('account') > 1)
			subtext = '<br><span class="item-subtitle color-gray">' + account.description + '</span>';
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
	if ((day+'').length == 1) day = '0'+day;

	month = date.getMonth()+1; // month is 0-based
	if ((month+'').length == 1) month = '0'+month;

	hours = date.getHours();
	if ((hours+'').length == 1) hours = '0'+hours;

	minutes = date.getMinutes();
	if ((minutes+'').length == 1) minutes = '0'+minutes;

	if (forFieldInput)
		return date.getFullYear() + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
	else
		return day + '.' + month + '.' + date.getFullYear() + ' ' + hours + ':' + minutes;
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
	if (appendZero)
	$list.append(
		$('<option>').val(0).text('All')
	);

	var catQuery = {disabled: false};
	if (allEntries)
		catQuery = null;

	var categories = db.queryAll('category', {query: catQuery, sort: [['order', 'ASC']]});

	for(i = 0; i < categories.length; i++) {

		var $option = $('<option>').val(categories[i].uniqueid).text(categories[i].description);

		// select entry if defined
		if (selectedID && selectedID == categories[i].uniqueid)
			$option.attr('selected', 'selected');

		$temp.append( $option );
	}

	// add to actual list
	$list.append( $temp.html() );
}



/**
 * adds all months as options to select dropdown
 * and optionally selects one entry by month identifier (0-11)
 *
 * @param {domSelector/jQueryObject} domElement selector or element representing a select dropdown
 * @param {int} selectedID (optional) ID number of month to select (zero based)
 */
function createMonthOptions(domElement, selectedID) {

	selectedID = selectedID || false;
	var $list = $(domElement);
	var $temp = $('<div />');

	// empty dropdown list
	$list.empty();

	var months = window.i18n.month;

	for(i = 0; i < months.length; i++) {

		var $option = $('<option>').val(i).text(months[i]);

		// select entry if defined
		if (selectedID && selectedID == i)
			$option.attr('selected', 'selected');

		$temp.append( $option );
	}

	// add to actual list
	$list.append( $temp.html() );
}



/**
 * adds years as options to select dropdown
 * and optionally selects one entry
 *
 * @param {domSelector/jQueryObject} domElement selector or element representing a select dropdown
 * @param {int} selectedID (optional) year to select
 */
function createYearOptions(domElement, selectedID) {

	selectedID = selectedID || false;
	var $list = $(domElement);
	var $temp = $('<div />');

	// empty dropdown list
	$list.empty();

	var startYear = new Date().getFullYear();

	for(i = startYear + 1; i > startYear - 10; i--) {

		var $option = $('<option>').val(i).text(i);

		// select entry if defined
		if (selectedID && selectedID == i)
			$option.attr('selected', 'selected');

		$temp.append( $option );
	}

	// add to actual list
	$list.append( $temp.html() );
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
	if (appendZero)
	$list.append(
		$('<option>').val(0).text('All')
	);

	var accQuery = {disabled: false};
	if (allEntries)
		accQuery = null;

	var accounts = db.queryAll('account', {query: accQuery, sort: [['order', 'ASC']]});

	for(i = 0; i < accounts.length; i++) {

		var $option = $('<option>').val(accounts[i].uniqueid).text(accounts[i].description);

		// select entry if defined
		if (selectedID && selectedID == accounts[i].uniqueid)
			$option.attr('selected', 'selected');

		$temp.append( $option );
	}

	// add to actual list
	$list.append( $temp.html() );
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
		validDescription = description.replace('"',"'");
		validDeleted = (deleted == 'true');
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
	if (domBalance)
		$balance = $(domBalance);

	var listBalance = 0;
	var page = window.globals.temp[tempID];

	// get categories
	var categories = db.queryAll('category', {sort: [['order', 'ASC']]});
	var _category = {};
	for(var j = 0; j < categories.length; j++) {
		_category[ categories[j].uniqueid ] = categories[j];
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
	for(i = 0; i < items.length; i++) {

		var row = items[i];
		listBalance += row.price;

		// render items if in current load range
		if (i >= page.infiniteScroll.lastIndex
				&& i < page.infiniteScroll.lastIndex + window.globals.static.infiniteScrollItemsPerLoad) {

				var rowCategory = _category[row.category];
				var description = row.description;
				var category = ' | ' + rowCategory.description;

				if (description == null || description.length == 0) {
					description = '<span class="color-gray">' + rowCategory.description + '</span>';
					category = '';
				}

				// don't add delete button, if param is set
				var deleteButton = '<a class="swipeout-delete swipeout-overswipe" data-confirm="Are you sure that you want to delete this item?" href="">Delete</a>';
				if (noDelete)
					deleteButton = '';

				$list.append(
					'<li class="swipeout" data-uniqueid="' + row.uniqueid + '" data-tempid="' + tempID + '">' +
					'	<div class="swipeout-content item-content">' +
					'		<div class="item-media">' +
					'			<span class="icon-wrap"><i class="color-black icon ion ' + getIcons(rowCategory.icon) + '"></i></span>' +
					'		</div>' +
					'		<div class="item-inner">' +
					'			<div class="item-title-row">' +
					'				<div class="item-title">' + description + '</div>' +
					'				<div class="item-after">' +
										formatPrice(row.price, row.account) +
					'				</div>' +
					'			</div>' +
					'			<div class="item-subtitle color-gray">' + formatDate(row.timestamp) + category + '</div>' +
					'		</div>' +
					'	</div>' +
					'	<div class="swipeout-actions-right">' +
					'		<a href="" class="edit-item" data-uniqueid="' + row.uniqueid + '" data-tempid="' + tempID + '">Edit</a>' +
							deleteButton +
					'	</div>' +
					'</li>'
				);
		}
	}

	// update infiniteScroll variables
	page.infiniteScroll.lastIndex = page.infiniteScroll.lastIndex + window.globals.static.infiniteScrollItemsPerLoad;
	if ( page.infiniteScroll.lastIndex > items.length )
		page.infiniteScroll.endReached = true;

	//flush list to DOM element
	if (infiniteScrollReset)
		$(domList).empty();
	$(domList).append( $list.html() );

	// output list balance
	if (domBalance)
		$balance.html( formatPrice(listBalance) );

	// handler for editing items - open popup
	$$('.page-expenses-list .edit-item').on('click', function (e) {

		var editID = $(e.target).attr('data-uniqueid');
		var tempID = $(e.target).attr('data-tempid');

		// get item data and fill in the form on popup
		var editItem = db.query('item', {uniqueid: editID})[0];

		$('.popup-edit-item').attr('data-uniqueid', editID);
		$('.popup-edit-item').attr('data-tempid', tempID);

		$('.popup-edit-item #form-edit-price').val(editItem.price);
		$('.popup-edit-item #form-edit-description').val(editItem.description);
		$('.popup-edit-item #form-edit-date').val( formatDate(editItem.timestamp, true) );
		$('.popup-edit-item').attr('data-deleted', editItem.deleted);
		createCategoryOptions( $('.popup-edit-item #form-edit-category'), editItem.category, false, true );
		createAccountOptions( $('.popup-edit-item #form-edit-account'), editItem.account, false, true );

		// datepicker
		//createDatetimePicker(new Date(editItem.timestamp), '#form-edit-date');

		// if deleted, show restore button and add restore handler
		if ( editItem.deleted ) {

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

					db.update('item', {uniqueid: editID},
						function (row) {
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
					updateItemList( $(page.container).find('#expenses-list-category').val(), tempID, true );

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
		db.update('item', {uniqueid: delID},
			function (row) {
				row.deleted = true;
				row.lastupdate = Date.now();
				row.synchronized = false;
				return row;
			});
		delItem = db.query('item', {uniqueid: delID});

		// get category description
		delItemCategory = db.query('category', {uniqueid: delItem[0].category});

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
			hold: 2000
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

	var _category = db.queryAll('category', {sort: [['order', 'ASC']]});

	for(var i = 0; i < _category.length; i++) {

		var cat = _category[i];

		var checked = cat.disabled ? '' : ' checked="checked"';

		$list.append(
			'<li class="swipeout" data-uniqueid="' + cat.uniqueid + '">' +
			'	<label class="label-checkbox swipeout-content item-content disabled">' +
			'		<input type="checkbox" id="cat-' + cat.uniqueid + '"' + checked + '>' +
			'		<div class="item-media">' +
			'			<i class="icon icon-form-checkbox"></i>' +
			'		</div>' +
			'		<div class="item-inner">' +
			'			<div class="item-title">' + cat.description + '</div>' +
			'			<div class="item-after">' +
			'				<i class="icon ion ' + getIcons(cat.icon) + '"></i>' +
			'			</div>' +
			'		</div>' +
			'	</label>' +
			'	<div class="sortable-handler"></div>' +
			'	<div class="swipeout-actions-right">' +
			'		<a href="#" class="edit-category" data-uniqueid="' + cat.uniqueid + '">Edit</a>' +
			'	</div>' +
			'</li>'
		);
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

		var newID = createUniqueid( Date.now(), 'New Category'+Date.now());

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

	var accounts = db.queryAll('account', {sort: [['order', 'ASC']]});

	for(var i = 0; i < accounts.length; i++) {

		var acc = accounts[i];

		var checked = acc.disabled ? '' : ' checked="checked"';

		$list.append(
			'<li class="swipeout" data-uniqueid="' + acc.uniqueid + '">' +
			'	<label class="label-checkbox swipeout-content item-content disabled">' +
			'		<input type="checkbox" id="cat-' + acc.uniqueid + '"' + checked + '>' +
			'		<div class="item-media">' +
			'			<i class="icon icon-form-checkbox"></i>' +
			'		</div>' +
			'		<div class="item-inner">' +
			'			<div class="item-title">' + acc.description + '</div>' +
			'			<div class="item-after">' +
			 				formatPrice(acc.initial_balance) +
			'			</div>' +
			'		</div>' +
			'	</label>' +
			'	<div class="sortable-handler"></div>' +
			'	<div class="swipeout-actions-right">' +
			'		<a href="#" class="edit-category" data-uniqueid="' + acc.uniqueid + '">Edit</a>' +
			'	</div>' +
			'</li>'
		);
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

		var newID = createUniqueid( Date.now(), 'New Account'+Date.now());

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
	var itemQuery = {deleted: false};
	var itemSort = [['timestamp', 'DESC']];
	var itemLimit = null;
	var itemDomBalance = $(page.container).find('#expenses-list-balance');
	var itemNoDelete = false;
	var request = page.query.request;

	// add filter for category
	if (filterCategory != 0)
		itemQuery.category = filterCategory;

	// with selectmonth time filter
	if (page.query.request === 'selectmonth') {
		page.query.title = 'Select month';

		// on every reload need to re-calculate start and end
		var selectedMonth = parseInt( $(page.container).find('#expenses-list-month').val() );
		var selectedYear = parseInt( $(page.container).find('#expenses-list-year').val() );
		var startDate = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0);
		var endDate = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0);
		startDate.setFullYear(selectedYear, selectedMonth);
		endDate.setFullYear(selectedYear, selectedMonth+1);

		page.query.start = startDate.getTime();
		page.query.end = endDate.getTime();

		// set request to timerange for proper handling
		request = 'timerange';
	}

	// override standards for special conditions
	switch(request) {

		case 'timerange':

			// if no range is defined, get latest
			if (page.query.start == null || page.query.end == null) {
				itemLimit = 50;
				page.query.title = 'Latest by date (error)';
				break;
			}

			itemQuery = function (row) {
					if (!row.deleted &&
						row.timestamp >= page.query.start &&
						row.timestamp < page.query.end &&
						(filterCategory == 0 || row.category == filterCategory) )
						return true;
					else
						return false;
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
	$(page.navbarInnerContainer).find('#expenses-list-title').html( (page.query.title).replace('+', ' ').replace('%20', ' ') );
	// add items to list
	createItemListElements( $(page.container).find('#expenses-list-items'), itemQuery, itemSort, itemLimit, itemDomBalance, itemNoDelete, tempID, infiniteScrollReset );
}



/**
 * Opens 'edit category' popup with given category uniqueid
 *
 * @param {String} editID uniqueid of category to be edited
 */
function openCategoryPopup(editID) {

	// get item data and fill in the form on popup
	var editCat = db.query('category', {uniqueid: editID})[0];

	$('.popup-edit-category').attr('data-uniqueid', editID);
	$('.popup-edit-category #form-category-description').val(editCat.description);

	// create icon selector
	$('.popup-edit-category #form-category-icon').empty();
	var icons = getIcons();
	for(var z = 0; z < icons.length; z++) {

		var selected = '';
		if (z == editCat.icon)
			selected = ' class="icon-selected"';

		$('.popup-edit-category #form-category-icon').append(
			'<li data-id="' + z + '"' + selected + '><i class="' + icons[z] + '"></i></li>'
		);
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

				db.update('category', {uniqueid: editID},
					function (row) {
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
	var editObj = db.query('account', {uniqueid: editID})[0];

	$('.popup-edit-account').attr('data-uniqueid', editID);
	$('.popup-edit-account #form-account-description').val(editObj.description);
	$('.popup-edit-account #form-account-balance').val(editObj.initial_balance);


	// save handler
	$('.popup-edit-account-save').on('click', function (e) {

		e.preventDefault();
		var editID = $('.popup-edit-account').attr('data-uniqueid');

		if (editID.length > 1) {

			var newDescription = $('.popup-edit-account #form-account-description').val();
			var newBalance = parseFloat( $('.popup-edit-account #form-account-balance').val() );

			if (newDescription.length > 0 && (''+newBalance).length > 0 && newBalance != NaN) {//TODO validation of numbers

				db.update('account', {uniqueid: editID},
					function (row) {
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

	if (!dateObj)
		dateObj = today;

	var picker = expApp.picker({
			input: cssSelector,
			toolbar: false,
			inputReadOnly: true,
			rotateEffect: false,

			value: [dateObj.getMonth(), dateObj.getDate(), dateObj.getFullYear(), dateObj.getHours(), (dateObj.getMinutes() < 10 ? '0' + dateObj.getMinutes() : dateObj.getMinutes())],

			onChange: function (picker, values, displayValues) {
					var daysInMonth = new Date(picker.value[2], picker.value[0]*1 + 1, 0).getDate();
					if (values[1] > daysInMonth) {
							picker.cols[1].setValue(daysInMonth);
					}
			},

			formatValue: function (p, values, displayValues) {

					var month = parseInt(values[1])+1;
					return values[2] + '-' + (month < 10 ? '0'+month : month) + '-' + (values[0] < 10 ? '0'+values[0] : values[0]) + 'T' + values[3] + ':' + values[4];
			},

			cols: [
					// Days
					{
							values: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
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
							values: [0,1,2,3,4,5,6,7,8,9,10,11],
							displayValues: [1,2,3,4,5,6,7,8,9,10,11,12],//TODO('January February March April May June July August September October November December').split(' '),
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
							values: (function () {
									var arr = [];
									for (var i = ((dateObj.getFullYear() < today.getFullYear()) ? dateObj.getFullYear() : today.getFullYear())-5; i <= ((dateObj.getFullYear() > today.getFullYear()) ? dateObj.getFullYear() : today.getFullYear())+5; i++) { arr.push(i); }
									return arr;
							})(),
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
							values: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
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
							values: (function () {
									var arr = [];
									for (var i = 0; i <= 59; i++) { arr.push(i < 10 ? '0' + i : i); }
									return arr;
							})(),
							cssClass: 'smaller'
					}
			]
	});
	return picker;
}



function initApp() {

//////////////////////////////////////////////////////////////////
// index-left menu                                              //
//////////////////////////////////////////////////////////////////
pageIndexLeft = expApp.onPageInit('index-left', function (page) {

	// generate links to expenses in menu
	var currentMonth = (new Date()).getMonth();
	var currentYear = (new Date()).getFullYear();
	var startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
	var endDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);

	$('#menu-list').empty();
	var entriesAvailable = false;
	var amountOfMonthsShown = getSettings('ui_months_shown');
	var setFutureEntry = true;

	for(var i = amountOfMonthsShown; i >= 0; i--) {

		var monthLabel = setFutureEntry ? 'Future expenses' : (window.i18n.month[currentMonth] + ' ' + currentYear);

		if (setFutureEntry) {
			startDate.setFullYear(currentYear, currentMonth+1);
			endDate.setFullYear(currentYear+10, currentMonth+1);
		} else {
			startDate.setFullYear(currentYear, currentMonth);
			endDate.setFullYear(currentYear, currentMonth+1);
		}

		// create menu link label and data object (is given to expenses page)
		// data object contains information which list to show
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
			for(var j = 0; j < monthItems.length; j++) {
				monthBalance += monthItems[j].price;
			}

			// add link to menu
			$('#menu-list').append(
				'<li><a href="expenses-list.html?' + $.param(dataObj) + '" data-view=".view-main" class="item-link close-panel item-content">' +
				'	<div class="item-inner">' +
				'		<div class="item-title">' + monthLabel + '</div>' +
				'		<div class="item-after">' + formatPrice(monthBalance) + '</div>' +
				'</div></a></li>'
			);
		}

		if (setFutureEntry) {
			setFutureEntry = false;
		} else {
			currentMonth--;
			if (currentMonth === -1) {
				currentMonth = 11;
				currentYear--;
			}
		}
	}

	// if no entries found, show notice
	if (!entriesAvailable) {

		$('#menu-list').append(
			'<li><div class="item-content">' +
			'	<div class="item-inner">' +
			'		No expenses added yet.' +
			'</div></div></li>'
		);
	// if entries, show additional sortings.
	} else {

		$('#menu-list').append(
			'<li><a href="expenses-list.html?request=selectmonth" data-view=".view-main" class="item-link close-panel item-content">' +
			'	<div class="item-inner">' +
			'		Select month' +
			'</div></a></li>' +
				'<li><a href="expenses-list.html?request=lastupdate" data-view=".view-main" class="item-link close-panel item-content">' +
				'	<div class="item-inner">' +
				'		Last updated' +
				'</div></a></li>' +
				'<li><a href="expenses-list.html?request=latest" data-view=".view-main" class="item-link close-panel item-content">' +
				'	<div class="item-inner">' +
				'		Latest by date' +
				'</div></a></li>' +
				'<li><a href="expenses-list.html?request=deleted" data-view=".view-main" class="item-link close-panel item-content">' +
				'	<div class="item-inner">' +
				'		Last deleted' +
				'</div></a></li>'
			);
	}
});



//////////////////////////////////////////////////////////////////
// Index                                                        //
//////////////////////////////////////////////////////////////////
pageIndex = expApp.onPageInit('index index-1', function (page) {

	// assume main view if page is not defined
	page = page || {container:'.view-main'};

	// add categories/accounts to dropdown select
	createCategoryOptions( $(page.container).find('#form-add-category') );
	createAccountOptions( $(page.container).find('#form-add-account'), false, false, true );

	// datepicker
	var today = new Date();
	//createDatetimePicker(today, '#form-add-date');

	// add expense form: submit handler
	$(page.container).find('#form-add-submit').on('click', function (e) {

		e.preventDefault();

		// disable multiple inputs in short time
		if (!window.globals.state.blockedInput) {

			// disable button to prevent multiple entries (by accident)
			that = $( e.target );
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
					uniqueid: createUniqueid( Date.now(), addDate+addDescription+addPrice+addCategory+addAccount ),
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

				var addCategoryDescription = db.query('category', {uniqueid: addCategory});

				var notificationDescription = '';
				if (addDescription != null && addDescription.length != 0) {
					notificationDescription = ': ' + addDescription;
				}

				expApp.addNotification({
					title: 'Expense added',
					message: formatPrice(addPrice) + ' for <span class="color-blue">' + addCategoryDescription[0].description + '</span>' + notificationDescription,
					hold: 2000
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
	$(page.container).find('#total-balance').html( formatPrice(totalBalance) );

	// current month's balance
	var currentMonth = today.getMonth();
	var currentYear = today.getFullYear();
	var startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
	var endDate = new Date(currentYear, currentMonth+1, 1, 0, 0, 0, 0);

	var currentBalance = getBalanceFromTimerange(startDate, endDate);
	$(page.container).find('#total-balance-month').html( formatPrice(currentBalance) );

	// last month's total balance
	var lastBalance = totalBalance - currentBalance;
	$(page.container).find('#total-balance-lastmonth').html( formatPrice(lastBalance) );

	// account balances
	var accounts = getAccounts();
	$(page.container).find('#index-account-balance').empty();

	for(var a = 0; a < accounts.length; a++) {

		var balance = getAccountBalance(accounts[a].uniqueid);

		$(page.container).find('#index-account-balance').append(
			'<li><div class="item-content">' +
			'	<div class="item-inner">' +
			'		<div class="item-title">' + accounts[a].description + '</div>' +
			'		<div class="item-after">' + formatPrice(balance) + '</div>' +
			'	</div>' +
			'</div></li>'
		);
	}
});



//////////////////////////////////////////////////////////////////
// expenses-list                                                //
//////////////////////////////////////////////////////////////////
expApp.onPageInit('expenses-list', function (page) {

	// save page query for later usage in globals.temp
	var tempID = createUniqueid(Date.now(), page.query.request);
	window.globals.temp[tempID] = page;
	$(page.container).find('#expenses-list-category, #expenses-list-month, #expenses-list-year').attr('data-temppage', tempID);

	// add categories to dropdown select
	createCategoryOptions( $(page.container).find('#expenses-list-category'), false, true );

	// category dropdown: onchange handler
	$(page.container).find('#expenses-list-category').on('change', function (e) {

		var catID = $(e.delegateTarget).val();
		var tempID = $(e.delegateTarget).attr('data-temppage');

		updateItemList(catID, tempID, true);
	});

	// if page has month/year filter, activate
	if (page.query.request === 'selectmonth') {
		$(page.container).find('.expenses-list-time-wrapper').show();

		// fill dropdowns with values
		createMonthOptions( $(page.container).find('#expenses-list-month'), new Date().getMonth() );
		createYearOptions( $(page.container).find('#expenses-list-year'), new Date().getFullYear() );

		// onchange handler
		// month or year dropdown: onchange handler
		$(page.container).find('#expenses-list-month, #expenses-list-year').on('change', function (e) {

			var tempID = $(e.delegateTarget).attr('data-temppage');
			var catID = $(window.globals.temp[tempID].container).find('#expenses-list-category').val();

			updateItemList(catID, tempID, true);
		});
	}

	// add tempID to page-content container and attach infinite scroll
	$(page.container).find('.page-content').addClass('infinite-scroll-' + tempID);
	expApp.attachInfiniteScroll('.infinite-scroll-' + tempID);

	// Attach 'infinite' event handler
	$('.infinite-scroll-' + tempID).on('infinite', function () {

	  // Exit, if loading in progress
	  if (window.globals.state.infiniteScrollLoading) return;

	  // Set loading flag
	  window.globals.state.infiniteScrollLoading = true;

	  // Emulate 100ms loading
	  setTimeout(function () {
	    // Reset loading flag
	    window.globals.state.infiniteScrollLoading = false;
			var page = window.globals.temp[tempID];

			if ( page.infiniteScroll.endReached ) {
				// Nothing more to load, detach infinite scroll events to prevent unnecessary loadings
				expApp.detachInfiniteScroll('.infinite-scroll-' + tempID);
				// Remove preloader
				$('.infinite-scroll-' + tempID + ' .infinite-scroll-preloader').remove();
				return;
			}

			updateItemList( $(page.container).find('#expenses-list-category').val(), tempID, false);

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

	// SET VALUES IN SETTINGS UI
	$('#settings-ui_money_format').find('option[value="' + settings['ui_money_format'] + '"]').attr('selected', 'selected');
	$('#settings-ui_months_shown').find('option[value="' + settings['ui_months_shown'] + '"]').attr('selected', 'selected');

	if (settings['sync_enabled'])
		$('#settings-sync_enabled').prop('checked', 'checked');

	if (settings['sync_startup'])
		$('#settings-sync_startup').prop('checked', 'checked');

	// SAVE HANDLERS
	// change handler: ui_money_format
	$('#settings-ui_money_format').on('change', function () {
		setSettings('ui_money_format', $('#settings-ui_money_format').val() );
		console.log(getSettings('ui_money_format'));
	});
	// change handler: ui_money_format
	$('#settings-ui_months_shown').on('change', function () {
		setSettings('ui_months_shown', $('#settings-ui_months_shown').val() );
		console.log(getSettings('ui_months_shown'));
	});
	// change handler: sync_enabled
	$('#settings-sync_enabled').on('change', function () {
		setSettings('sync_enabled', $('#settings-sync_enabled').is(':checked') );
		console.log(getSettings('sync_enabled'));
	});
	// change handler: sync_startup
	$('#settings-sync_startup').on('change', function () {
		setSettings('sync_startup', $('#settings-sync_startup').is(':checked') );
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
		if ( $(e.target).hasClass('sortable') ) {

			$$('.toggle-sortable i').addClass('icon-ion-ios7-checkmark-outline').removeClass('icon-ion-ios7-drag');
			$('#settings-categories-list label.label-checkbox').removeClass('disabled');
		}
	});
	$$('.list-block.sortable').on('close', function (e) {

		// trigger events only when targeted on sorting list (prevent action when swiping on list elements)
		if ( $(e.target).hasClass('sortable') ) {

			$$('.toggle-sortable i').addClass('icon-ion-ios7-drag').removeClass('icon-ion-ios7-checkmark-outline');
			$('#settings-categories-list label.label-checkbox').addClass('disabled');

			// save list and its order
			$('#settings-categories-list li').each( function (index) {

				if ( $(this).is('[data-uniqueid]') ) {

					var catID = $(this).attr('data-uniqueid');
					var newDisabled = !( $(this).find('#cat-' + catID).is(':checked') );
					var newOrder = index+1;

					db.update('category',
						{uniqueid: catID},
						function (row) {
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
		if ( $(e.target).hasClass('sortable') ) {

			$$('.toggle-sortable i').addClass('icon-ion-ios7-checkmark-outline').removeClass('icon-ion-ios7-drag');
			$('#settings-accounts-list label.label-checkbox').removeClass('disabled');
		}
	});
	$$('.list-block.sortable').on('close', function (e) {

		// trigger events only when targeted on sorting list (prevent action when swiping on list elements)
		if ( $(e.target).hasClass('sortable') ) {

			$$('.toggle-sortable i').addClass('icon-ion-ios7-drag').removeClass('icon-ion-ios7-checkmark-outline');
			$('#settings-accounts-list label.label-checkbox').addClass('disabled');

			// save list and its order
			$('#settings-accounts-list li').each( function (index) {

				if ( $(this).is('[data-uniqueid]') ) {

					var catID = $(this).attr('data-uniqueid');
					var newDisabled = !( $(this).find('#cat-' + catID).is(':checked') );
					var newOrder = index+1;

					db.update('account',
						{uniqueid: catID},
						function (row) {
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
	page = page || {container:'.view-main'};

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
		$('.popup-general .page-content').html(
			'<div class="content-block-title">Text content</div>' +
			'<div class="list-block">' +
				'<ul>' +
					'<li class="align-top">' +
						'<div class="item-content">' +
							'<div class="item-inner">' +
								'<div class="item-input">' +
									'<textarea style="height: 300px">' + createCSVDataLink(tableName, db.query(tableName), "ExpenSync CSV Export " + Date.now(), true) + '</textarea>' +
								'</div>' +
							'</div>' +
						'</div>' +
					'</li>' +
				'</ul>' +
			'</div>');
		expApp.popup('.popup-general');
	});

	// text json export button
	$(page.container).find('a#export-text-json').on('click', function () {
		// detect table name for export (which data shall be exported?)
		var tableName = $(page.container).find('#export-table').val();

		$('.popup-general .popup-title').html('JSON Export');
		$('.popup-general .page-content').html(
			'<div class="content-block-title">Text content</div>' +
			'<div class="list-block">' +
				'<ul>' +
					'<li class="align-top">' +
						'<div class="item-content">' +
							'<div class="item-inner">' +
								'<div class="item-input">' +
									'<textarea style="height: 300px">' + JSON.stringify(db.query(tableName)) + '</textarea>' +
								'</div>' +
							'</div>' +
						'</div>' +
					'</li>' +
				'</ul>' +
			'</div>');
		expApp.popup('.popup-general');
	});

	// json import button
	$(page.container).find('a#form-import-json-submit').on('click', function (e) {

		e.preventDefault();

		// disable multiple inputs in short time
		if (!window.globals.state.blockedInput) {

			// disable button to prevent multiple entries (by accident)
			that = $( e.target );
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
			}

			if (!!importData && Array.isArray(importData)) {
				importData.forEach( function (row) {

					// in legacy data sets, the ID is included in a single row
					delete row.ID;

					// as this was not implemented yet in multideviceDatabase ...
					//db.insertOrUpdate(importTableName, {uniqueid: row.uniqueid}, row);

					// ... taking this approach
					var rowExists = db.queryAll(importTableName, {query: {uniqueid: row.uniqueid}});
					console.debug("rowExists", rowExists, row.uniqueid, row.description);
					rowExists = rowExists.length === 1;
					if (rowExists) {
						db.update(importTableName, {uniqueid: row.uniqueid}, function (oldRow) {
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
    if (account.disabled)
      disabledAccounts.push(account.uniqueid);
		else
			accountSum += account.initial_balance;
  });

  var data = db.queryAll('item', {
      query: function (row) {
        if (!row.deleted && disabledAccounts.indexOf(row.account) === -1)
          return true;
        else
          return false;
      }
	});
	var dataCategory = db.query('category');

	dataCategory.forEach(function (c) {
		categories[c.uniqueid] = c.description;
	});

	//var runningTotal = accountSum;
	data.sort(function (a, b) {
		return (a.date < b.date) ? -1 : (a.date > b.date ? 1 : 0);
	});
	data.forEach(function (d) {
		d.timestamp = new Date(d.timestamp);
		d.timestampDay = new Date(d.timestamp.getFullYear(), d.timestamp.getMonth(), d.timestamp.getDate());
		d.monthYear = d3.time.format("%Y/%m").parse( d.timestamp.getFullYear() + '/' + (d.timestamp.getMonth()+1) );

		//runningTotal += d.price;
		//d.runningTotal = runningTotal;
	});

	// reduce functions for daily total and average
	function reduceAdd(p, v) {
    p.total += v.price;
    p.count++;
    //p.average = p.total / p.count;
    return p;
	}
	function reduceRemove(p, v) {
			p.total -= v.price;
			p.count--;
			//p.average = p.total / p.count;
			return p;
	}
	function reduceInitial() {
			return {
					total: 0,
					count: 0,
					//average: 0,
					type: 'price'
			};
	}

	// reduce functions for running total
	function runningReduceInitial() {
			return {
					total: 0,
					count: 0,
					//average: 0,
					type: 'runningTotal'
			};
	}

	var facts = crossfilter(data);
	var all = facts.groupAll();

	var dateDim = facts.dimension( dc.pluck('monthYear') );
	var dateTotal = dateDim.group().reduceSum( dc.pluck('price') );
	var minDate = dateDim.bottom(1)[0].timestamp;
	var maxDate = dateDim.top(1)[0].timestamp;

	facts.groupAll();
	var fullDateDim = facts.dimension( dc.pluck('timestampDay') );
	var averageGroup = fullDateDim.group().reduce(reduceAdd, reduceRemove, reduceInitial);
	var runningTotalGroup = fullDateDim.group().reduce(reduceAdd, reduceRemove, runningReduceInitial);

	facts.groupAll();
	var categoryDim = facts.dimension( dc.pluck('category') );
	var categoryTotalMinus = categoryDim.group().reduceSum( function (d) { if (d.price < 0) return d.price; else return 0; } );
	var categoryTotalPlus = categoryDim.group().reduceSum( function (d) { if (d.price > 0) return d.price; else return 0; } );
	var categoryTotalMinusSum = categoryDim.groupAll().reduceSum( function (d) { if (d.price < 0) return d.price; else return 0; } );
	var categoryTotalPlusSum = categoryDim.groupAll().reduceSum( function (d) { if (d.price > 0) return d.price; else return 0; } );

	facts.groupAll();
	var accountDim = facts.dimension( dc.pluck('account') );
	var accountTotalMinus = accountDim.group().reduceSum( function (d) { if (d.price < 0) return d.price; else return 0; } );
	var accountTotalPlus = accountDim.group().reduceSum( function (d) { if (d.price > 0) return d.price; else return 0; } );
	var accountTotalMinusSum = accountDim.groupAll().reduceSum( function (d) { if (d.price < 0) return d.price; else return 0; } );
	var accountTotalPlusSum = accountDim.groupAll().reduceSum( function (d) { if (d.price > 0) return d.price; else return 0; } );

	// count all the facts and print out the data counts
	dc.dataCount(".dc-data-count")
		.dimension(facts)
		.group(all);

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
	monthScale.domain([minDate,maxDate]);

	var categoryTitleFunction = function (d) {
		var sum = d.value > 0 ? categoryTotalPlusSum : categoryTotalMinusSum;
		return categories[d.key] + ': ' + getFormattedPrice(Math.round(d.value * 100) / 100) + ' (' + (Math.round(d.value / sum.value() * 1000) / 10) + ' %)';
	};
	var accountTitleFunction = function (d) {
		var sum = d.value > 0 ? accountTotalPlusSum : accountTotalMinusSum;
		return accounts[d.key] + ': ' + getFormattedPrice(Math.round(d.value * 100) / 100) + ' (' + (Math.round(d.value / sum.value() * 1000) / 10) + ' %)';
	};
	var updateTotals = function () {
		$('.dc-category-total-minus-sum').text(getFormattedPrice(categoryTotalMinusSum.value()));
		$('.dc-category-total-plus-sum').text(getFormattedPrice(categoryTotalPlusSum.value()));
		$('#dc-account-total-minus-sum').text(getFormattedPrice(accountTotalMinusSum.value()));
		$('#dc-account-total-plus-sum').text(getFormattedPrice(accountTotalPlusSum.value()));
	};
	var removeEmptyBinsCount = function (sourceGroup) {
    return {
      all: () => {
        return sourceGroup.all().filter(function(d) {
          return d.value.count != 0;
        });
      }
    };
	};
	var accumulateGroup = function (sourceGroup, startValue) {
    return {
      all: () => {
        var cumulate = startValue;
        return sourceGroup.all().map(function(d) {
          cumulate += d.value.total;
					d.value.accumulated = cumulate;
          return d;
      	});
      }
    };
	};

	monthChart
		.width(function () {
			return $('#dc-month-chart').width();
		})
		.height(200)
		.margins({left: 40, right: 30, top: 20, bottom: 20})
		.dimension(dateDim)
		.group(dateTotal)
		.x( monthScale )
		.xUnits(d3.time.months)
		.elasticX(true)
		.elasticY(true)
		.colors(d3.scale.ordinal().domain(["positive","negative"])
																	.range(["#4cd964","#ff3b30"]))
		.colorAccessor(function (d) {
			if (d.value > 0)
				return "positive"
			return "negative";
		})
		.brushOn(true)
		.round(d3.time.month.round)
		.title(function (d) {
			return (d.key.getMonth() + 1) + '/' + d.key.getFullYear() + ': ' + getFormattedPrice(Math.round(d.value * 100) / 100);
		})
		.on('renderlet', function (chart) {
			updateTotals();
		})
		.yAxis().ticks(4);

	trendChart
		.width(function () {
			return $('#dc-trend-chart').width();
		})
		.height(200)
		.margins({left: 40, right: 30, top: 20, bottom: 20})
		.dimension(fullDateDim)
		.brushOn(false)
		.elasticX(true)
		.elasticY(true)
		.title(function (d) {
			var dateObj = d.key;
			var title = dateObj.getDate() + '.' + (dateObj.getMonth() + 1) + '.' + dateObj.getFullYear() + ':';
			if (d.value.type === 'price') {
				title += ' expense for this day ' + parseFloat(d.value.total).toFixed(2);
			} else {
				title += ' overall total balance ' + parseFloat(d.value.accumulated).toFixed(2);
			}
			// TODO debug delete
			title += " ||| debug:" + JSON.stringify(d.value);
			return title;
		})
		.renderHorizontalGridLines(true)
		.x( d3.time.scale() )
		.legend(dc.legend().x(50).y(20).gap(10))
		.compose([
			dc.lineChart(trendChart)
				.ordinalColors(['#ff9500'])
				.group( removeEmptyBinsCount(averageGroup), 'Daily expense')
				.valueAccessor(function (d) {
					return d.value.total;
				}),
			dc.lineChart(trendChart)
				.ordinalColors(['#4cd964'])
				.group( accumulateGroup(removeEmptyBinsCount(runningTotalGroup), accountSum), 'Total balance')
				.valueAccessor(function (d) {
					return d.value.accumulated;
				})
		])
		.yAxis().ticks(4);


	categoryMinusChart
		.width(function () {
			return $('#dc-category-minus-chart').width();
		})
		.height(500)
		.margins({left: 30, right: 30, top: 20, bottom: 20})
		.dimension(categoryDim)
		.group(categoryTotalMinus)
		.label(function (d) {
			return categories[d.key];
		})
		.title(categoryTitleFunction)
		.elasticX(true)
		.xAxis().ticks(4);

	categoryPlusChart
		.width(function () {
			return $('#dc-category-plus-chart').width();
		})
		.height(500)
		.margins({left: 30, right: 30, top: 20, bottom: 20})
		.dimension(categoryDim)
		.group(categoryTotalPlus)
		.label(function (d) {
			return categories[d.key];
		})
		.title(categoryTitleFunction)
		.elasticX(true)
		.xAxis().ticks(4);

	categoryMinusPieChart
		.width(function () {
			return $('#dc-category-minus-pie-chart').width();
		})
		.height(300)
		.radius(115)
		.dimension(categoryDim)
		.group(categoryTotalMinus)
		.label(function (d) {
			return '';
		})
		.title(categoryTitleFunction)
	categoryMinusPieChart.onClick = function () {};

	categoryPlusPieChart
		.width(function () {
			return $('#dc-category-plus-pie-chart').width();
		})
		.height(300)
		.radius(115)
		.dimension(categoryDim)
		.group(categoryTotalPlus)
		.label(function (d) {
			return '';
		})
		.title(categoryTitleFunction);
	categoryPlusPieChart.onClick = function () {};

	accountMinusPieChart
		.width(function () {
			return $('#dc-account-minus-pie-chart').width();
		})
		.height(300)
		.radius(115)
		.dimension(accountDim)
		.group(accountTotalMinus)
		.label(function (d) {
			return '';
		})
		.title(accountTitleFunction);

	accountPlusPieChart
		.width(function () {
			return $('#dc-account-plus-pie-chart').width();
		})
		.height(300)
		.radius(115)
		.dimension(accountDim)
		.group(accountTotalPlus)
		.label(function (d) {
			return '';
		})
		.title(accountTitleFunction);

	dataTable
		.dimension(dateDim)
		.group(function (d) {
			return d.timestamp.getFullYear() + ' / ' + ('0' + (d.timestamp.getMonth()+1)).slice(-2);
		})
		.size(25)
		.order(d3.descending)
		.columns([
		  {
				label: 'Date',
			 	format: function (d) {
					var formattedDate = ('0' + d.timestamp.getDate()).slice(-2) + '.'
							 + ('0' + (d.timestamp.getMonth()+1)).slice(-2) + '.'
							 + d.timestamp.getFullYear() + ' '
							 + ('0' + d.timestamp.getHours()).slice(-2) + ':'
							 + ('0' + d.timestamp.getMinutes()).slice(-2);
					return formattedDate;
				}
			},
			{
				label: 'Category',
			 	format: function (d) {
					return categories[d.category];
				}
			},
			{
				label: 'Description',
			 	format: function (d) {
					return d.description;
				}
			},
			{
				label: 'Price',
			 	format: function (d) {
					return parseFloat(d.price).toFixed(2);
				}
			}
		]);

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
if (window.globals.properties.debug)
	console.debug("DB content: ", JSON.parse(db.serialize()) );

}// end initApp()
