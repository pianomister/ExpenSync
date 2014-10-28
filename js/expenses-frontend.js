//expenses-frontend.js

properties = {
	version: '0.2',
	name: 'ExpenSync',
	developer: 'Stephan Giesau',
	website: 'http://www.stephan-giesau.de/',
	debug: true
}

i18n = {

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
	]

}

globals = {

	icons: [
		"ion-ios7-more",
		"ion-ios7-cart",
		"ion-fork",
		"ion-ios7-wineglass",
		"ion-ios7-musical-notes",
		"ion-ios7-pricetags",
		"ion-model-s",
		"ion-plane",
		"ion-map",
		"ion-ios7-home",
		"ion-ios7-briefcase",
		"ion-cash",
		"ion-ios7-medkit",
		"ion-university",
		"ion-ios7-home",
		"ion-ios7-telephone"
	]

}


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
var db = new localStorageDB("expenSync", localStorage);

// Check if the database was just created. Then create all tables
if( db.isNew() ) {

	createLocalDatabase();
}



/**
 * create a unique ID for items based on time, a given salt and browser's user agent
 */
function createUniqueid(timestamp, salt, noUserAgent) {

	noUserAgent = noUserAgent || false;

	var str = '' + timestamp + salt;
	if(!noUserAgent)
		str += navigator.userAgent;

	return calcMD5( str );
}



/**
 * returns a price, suitable colored and currency format
 *
 * @param {float} price number to be displayed as price
 * @param {string} account (optional) text to be displayed below price
 */
function formatPrice(price, account) {

	account = account || false;

	colorClass = 'green';
	if(price < 0)
		colorClass = 'red';

	formattedPrice = parseFloat(price).toFixed(2);

	// get number format from settings
	money_format = db.query('settings', {key: 'ui_money_format'});
	if(money_format[0].value == 'comma')
		formattedPrice = formattedPrice.replace('.', ',');

	// subtitle displayed below price
	var subtext = '';
	if(account)
		subtext = '<br><span class="item-subtitle color-gray">' + getAccounts(account).description + '</span>';

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
	if((day+'').length == 1) day = '0'+day;

	month = date.getMonth()+1; // month is 0-based
	if((month+'').length == 1) month = '0'+month;

	hours = date.getHours();
	if((hours+'').length == 1) hours = '0'+hours;

	minutes = date.getMinutes();
	if((minutes+'').length == 1) minutes = '0'+minutes;

	if(forFieldInput)
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
	if(appendZero)
	$list.append(
		$('<option>').val(0).text('All')
	);

	var catQuery = {disabled: false};
	if(allEntries)
		catQuery = null;

	var categories = db.queryAll('category', {query: catQuery, sort: [['order', 'ASC']]});

	for(i = 0; i < categories.length; i++) {

		var $option = $('<option>').val(categories[i].uniqueid).text(categories[i].description);

		// select entry if defined
		if(selectedID && selectedID == categories[i].uniqueid)
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
	if(appendZero)
	$list.append(
		$('<option>').val(0).text('All')
	);

	var accQuery = {disabled: false};
	if(allEntries)
		accQuery = null;

	var accounts = db.queryAll('account', {query: accQuery, sort: [['order', 'ASC']]});

	for(i = 0; i < accounts.length; i++) {

		var $option = $('<option>').val(accounts[i].uniqueid).text(accounts[i].description);

		// select entry if defined
		if(selectedID && selectedID == accounts[i].uniqueid)
			$option.attr('selected', 'selected');

		$temp.append( $option );
	}

	// add to actual list
	$list.append( $temp.html() );
}



/**
 * Validates and formats fields from add/edit item forms
 *
 * @return false if invalid, else an object with validated and formatted values
 */
function validateItemForm(price, category, description, date, account, deleted) {

	var validPrice, validCategory, validDescription, validDate, validAccount, validDeleted;
	deleted = deleted || false;

	// check if minimum input (price) is given
	if(price != 0 && price != null && parseFloat(price) != NaN && price.length != 0) {

		validPrice = parseFloat(price);
		validCategory = category;
		validDescription = description.replace('"',"'");
		validDeleted = (deleted == 'true');
		validAccount = account;

		if(account.length > 1 && category.length > 1) {

			// check if date is given, if yes, try to parse it
			if(date == undefined || date == null || date.length == 0 || Date.parse(date) == NaN) {
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
			expApp.alert('Please select an account an a category.');
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
 */
function createItemListElements(domList, itemQuery, itemSort, itemLimit, domBalance, noDelete) {

	domBalance = domBalance || false;
	noDelete = noDelete || false;
	$list = $('<div />');
	if(domBalance)
		$balance = $(domBalance);

	// calculate list balance
	var listBalance = 0;

	// get categories
	var categories = db.queryAll('category', {sort: [['order', 'ASC']]});
	var _category = {};
	for(var j = 0; j < categories.length; j++) {
		_category[ categories[j].uniqueid ] = categories[j];
	}

	// get items according to request params
	items = db.queryAll('item', { query: itemQuery,
								  sort: itemSort,
								  limit: itemLimit
								});

	// add items to expenses list
	for(i = 0; i < items.length; i++) {

		var row = items[i];
		var rowCategory = _category[row.category];
		var description = row.description;
		var category = ' | ' + rowCategory.description;

		if(description == null || description.length == 0) {
			description = '<span class="color-gray">' + rowCategory.description + '</span>';
			category = '';
		}

		// don't add delete button, if param is set
		var deleteButton = '<a class="swipeout-delete swipeout-overswipe" data-confirm="Are you sure that you want to delete this item?" href="">Delete</a>';
		if(noDelete)
			deleteButton = '';

		$list.append(
			'<li class="swipeout" data-uniqueid="' + row.uniqueid + '">' +
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
			'		<a href="" class="edit-item" data-uniqueid="' + row.uniqueid + '">Edit</a>' +
					deleteButton +
			'	</div>' +
			'</li>'
		);

		// add cost to list balance
		listBalance += row.price;
	}

	//flush list to DOM element
	$(domList).html( $list.html() );

	// output list balance
	if(domBalance)
		$balance.html( formatPrice(listBalance) );

	// handler for editing items - open popup
	$$('.page-expenses-list .edit-item').on('click', function (e) {

		var editID = $(e.target).attr('data-uniqueid');

		// get item data and fill in the form on popup
		var editItem = db.query('item', {uniqueid: editID})[0];

		$('.popup-edit-item').attr('data-uniqueid', editID);
		$('.popup-edit-item #form-edit-price').val(editItem.price);
		$('.popup-edit-item #form-edit-description').val(editItem.description);
		$('.popup-edit-item #form-edit-date').val( formatDate(editItem.timestamp, true) );
		$('.popup-edit-item').attr('data-deleted', editItem.deleted);
		createCategoryOptions( $('.popup-edit-item #form-edit-category'), editItem.category, false, true );
		createAccountOptions( $('.popup-edit-item #form-edit-account'), editItem.account, false, true );

		// if deleted, show restore button and add restore handler
		if( editItem.deleted ) {

			$('.popup-edit-item #form-edit-restore').show();

			$('.popup-edit-item #form-edit-restore').on('click', function(e) {

				$('.popup-edit-item').attr('data-deleted', false);
				$('.popup-edit-item-save').click();
			});

		} else {

			$('.popup-edit-item #form-edit-restore').hide();
		}

		// save handler
		$('.popup-edit-item-save').on('click', function(e) {

			e.preventDefault();
			var editID = $('.popup-edit-item').attr('data-uniqueid');

			if(editID.length > 1) {

				var newPrice = $('.popup-edit-item #form-edit-price').val();
				var newCategory = $('.popup-edit-item #form-edit-category').val();
				var newDescription = $('.popup-edit-item #form-edit-description').val();
				var newDate = $('.popup-edit-item #form-edit-date').val();
				var newDeleted = $('.popup-edit-item').attr('data-deleted');
				var newAccount = $('.popup-edit-item #form-edit-account').val();

				var validItem = validateItemForm(newPrice, newCategory, newDescription, newDate, newAccount, newDeleted);

				if(validItem) {

					db.update('item', {uniqueid: editID},
						function(row) {
							row.price = validItem.price;
							row.category = validItem.category;
							row.account = validItem.account;
							row.description = validItem.description;
							row.timestamp = validItem.date;
							row.deleted = validItem.deleted;
							row.lastupdate = Date.now();
							row.synchronized = false;
							row.version = properties.version;
							return row;
						});
					db.commit();

					expApp.closeModal('.popup-edit-item');

					//TODO re-render list and menu to update everything
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
			function(row) {
				row.deleted = true;
				row.lastupdate = Date.now();
				row.synchronized = false;
				return row;
			});
		db.commit();
		delItem = db.query('item', {uniqueid: delID});

		// get category description
		delItemCategory = db.query('category', {uniqueid: delItem[0].category});

		// set item description if available
		notificationDescription = '';
		if(delItem[0].description != null && delItem[0].description.length != 0) {
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
	$('#settings-categories-add').on('click', function(e) {

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
	$('#settings-accounts-add').on('click', function(e) {

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
 * Opens 'edit category' popup with given category uniqueid
 *
 * @param {String} editID uniqueid of category to be edited
 */
function openCategoryPopup(editID) {

	// get item data and fill in the form on popup
	var editCat = db.query('category', {uniqueid: editID})[0];

	$('.popup-edit-category').attr('data-uniqueid', editID);
	$('.popup-edit-category #form-category-description').val(editCat.description);

	// create icon options
	var icons = getIcons();
	for(var z = 0; z < icons.length; z++) {

		var selected = '';
		if(z == editCat.icon)
			selected = ' selected="selected"';

		$('#form-category-icon').append(
			'<option value="' + z + '"' + selected + '>' + icons[z] + '</option>'
		);
	}

	// save handler
	$('.popup-edit-category-save').on('click', function(e) {

		e.preventDefault();
		var editID = $('.popup-edit-category').attr('data-uniqueid');

		if(editID.length > 1) {

			var newDescription = $('.popup-edit-category #form-category-description').val();
			var newIcon = $('.popup-edit-category #form-category-icon').val();

			if(newDescription.length > 0 && newIcon.length > 0) {

				db.update('category', {uniqueid: editID},
					function(row) {
						row.description = newDescription;
						row.icon = newIcon;
						row.synchronized = false;
						row.lastupdate = Date.now();
						return row;
					});
				db.commit();

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
	$('.popup-edit-account-save').on('click', function(e) {

		e.preventDefault();
		var editID = $('.popup-edit-account').attr('data-uniqueid');

		if(editID.length > 1) {

			var newDescription = $('.popup-edit-account #form-account-description').val();
			var newBalance = parseFloat( $('.popup-edit-account #form-account-balance').val() );

			if(newDescription.length > 0 && (''+newBalance).length > 0 && newBalance != NaN) {//TODO validation of numbers

				db.update('account', {uniqueid: editID},
					function(row) {
						row.description = newDescription;
						row.initial_balance = newBalance;
						row.synchronized = false;
						row.lastupdate = Date.now();
						return row;
					});
				db.commit();

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





//////////////////////////////////////////////////////////////////
// index-left menu                                              //
//////////////////////////////////////////////////////////////////
pageIndexLeft = expApp.onPageInit('index-left', function (page) {

	// generate links to expenses in menu
	var currentMonth = (new Date()).getMonth();
	var currentYear = (new Date()).getFullYear();
	var startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0); // zero values for hours
	var endDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);

	$('#menu-list').empty();
	var entriesAvailable = false;

	for(var i = 15; i >= 0; i--) {

		startDate.setFullYear(currentYear, currentMonth);
		endDate.setFullYear(currentYear, currentMonth+1);

		// create menu link label and data object (is given to expenses page)
		// data object contains information which list to show
		var monthLabel = i18n.month[currentMonth] + ' ' + currentYear;
		var dataObj = {
			request: 'timerange',
			start: startDate.getTime(),
			end: endDate.getTime(),
			title: monthLabel
		};

		// get items for current month
		var monthBalance = 0;
		var monthItems = db.query('item',
			function(row) {
				if(!row.deleted && row.timestamp >= startDate.getTime() && row.timestamp < endDate.getTime())
					return true;
				else
					return false;
			});

		// only generate link if month has items
		if(monthItems.length > 0) {

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

		currentMonth--;
		if(currentMonth == -1) {
			currentMonth = 11;
			currentYear--;
		}
	}

	// if no entries found, show notice
	if(!entriesAvailable) {

		$('#menu-list').append(
			'<li><div class="item-content">' +
			'	<div class="item-inner">' +
			'		No expenses added yet.' +
			'</div></div></li>'
		);
	// if entries, show additional sortings.
	} else {

		$('#menu-list').append(
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
	createAccountOptions( $(page.container).find('#form-add-account') );

	// add expense form: submit handler
	$(page.container).find('#form-add-submit').on('click', function(e) {

		e.preventDefault();

		// disable multiple inputs in short time
		if(!window.blockedInput) {

			// disable button to prevent multiple entries (by accident)
			that = $( e.target );
			that.addClass('disabled');
			window.blockedInput = true;
			window.setTimeout(function() {
				that.removeClass('disabled');
				window.blockedInput = false;
			}, 1000);

			var addPrice = $(page.container).find('#form-add-price').val();
			var addCategory = $(page.container).find('#form-add-category').val();
			var addDescription = $(page.container).find('#form-add-description').val();
			var addDate = $(page.container).find('#form-add-date').val();
			var addAccount = $(page.container).find('#form-add-account').val();

			var validItem = validateItemForm(addPrice, addCategory, addDescription, addDate, addAccount, false);

			if(validItem) {

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
					version: properties.version
				});
				db.commit();

				var addCategoryDescription = db.query('category', {uniqueid: addCategory});

				var notificationDescription = '';
				if(addDescription != null && addDescription.length != 0) {
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

	// hide sync options if disabled
	if( !getSettings('sync_enabled') )
		$('.index-sync').html('<p>You can synchronize all expenses with your Dropbox. Enable Synchronization in <a href="settings.html" data-view=".view-left" class="open-panel">settings</a>.</p>');

	////////////////
	// calculate balances
	// total balance
	var totalBalance = 0;
	var allItems = db.query('item', {deleted: false});
	for(var i = 0; i < allItems.length; i++) {
		totalBalance += allItems[i].price;
	}

	var allAccounts = db.query('account', {disabled: false});
	for(var i = 0; i < allAccounts.length; i++) {
		totalBalance += allAccounts[i].initial_balance;
	}

	$(page.container).find('#total-balance').html( formatPrice(totalBalance) );

	// current month's balance
	var currentMonth = (new Date()).getMonth();
	var currentYear = (new Date()).getFullYear();
	var startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
	var endDate = new Date(currentYear, currentMonth+1, 0, 0, 0, 0, 0);

	var currentItems = db.queryAll('item', {
			query: function(row) {
				if(!row.deleted &&
					row.timestamp >= startDate.getTime() &&
					row.timestamp < endDate.getTime())
					return true;
				else
					return false;
			}
		});
	var currentBalance = 0;
	for(var i = 0; i < currentItems.length; i++) {
		currentBalance += currentItems[i].price;
	}
	$(page.container).find('#total-balance-month').html( formatPrice(currentBalance) );

	// last month's total balance
	var lastBalance = totalBalance - currentBalance;
	$(page.container).find('#total-balance-lastmonth').html( formatPrice(lastBalance) );
});



//////////////////////////////////////////////////////////////////
// expenses-list                                                //
//////////////////////////////////////////////////////////////////
expApp.onPageInit('expenses-list', function (page) {

	//TODO
	window.currentPageQuery = page.query;
	console.debug('init', page.query, window.currentPageQuery);

	// add categories to dropdown select
	createCategoryOptions( $(page.container).find('#expenses-list-category'), false, true );

	// category select dropdown TODO
	/*$(page.container).find('#expenses-list-category').on('change', function(e) {

		var catID = $(e.delegateTarget).val();

		page.query.category = catID;
		mainView.loadPage('expenses-list.html?' + $.param(page.query));
	});*/

	// evaluate page params to determine what to display
	// standard values
	var itemQuery = {deleted: false};
	var itemSort = [['timestamp', 'DESC']];
	var itemLimit = null;
	var itemDomBalance = $(page.container).find('#expenses-list-balance');
	var itemNoDelete = false;

	// override standards for special conditions
	switch(page.query.request) {

		case 'timerange':

			// if no range is defined, get latest
			if(page.query.start == null || page.query.end == null) {
				itemLimit = 50;
				page.query.title = 'Latest by date (error)';
				break;
			}

			itemQuery = function(row) {
					if(!row.deleted &&
						row.timestamp >= page.query.start &&
						row.timestamp < page.query.end)
						return true;
					else
						return false;
				};
			break;

		case 'deleted':
			itemQuery = {deleted: true};
			itemSort = [['lastupdate', 'DESC']];
			itemLimit = 50;
			itemDomBalance = false;
			itemNoDelete = true;
			page.query.title = 'Last deleted';
			break;

		case 'lastupdate':
			itemSort = [['lastupdate', 'DESC']];
			itemLimit = 50;
			page.query.title = 'Last updated';
			break;

		case 'latest':
		default:
			itemLimit = 50;
			page.query.title = 'Latest by date';
			break;
	}

	// add page title
	$(page.navbarInnerContainer).find('#expenses-list-title').html( (page.query.title).replace('+', ' ') );

	// add items to list
	createItemListElements( $(page.container).find('#expenses-list-items'), itemQuery, itemSort, itemLimit, itemDomBalance, itemNoDelete );

});



//////////////////////////////////////////////////////////////////
// settings                                                     //
//////////////////////////////////////////////////////////////////
expApp.onPageInit('settings', function (page) {

	// load settings
	var settings = getSettings();
	/*settings = [];

	for(i = 0; i < settings_rows.length; i++) {

		settings[ settings_rows[i].key ] = settings_rows[i].value;
	}*///TODO

	//$('#settings-preset_balance').val( settings['preset_balance'] );//TODO
	$('#settings-ui_money_format').find('option[value="' + settings['ui_money_format'] + '"]').attr('selected', 'selected');

	if(settings['sync_enabled'])
		$('#settings-sync_enabled').prop('checked', 'checked');

	if(settings['sync_startup'])
		$('#settings-sync_startup').prop('checked', 'checked');


	// save settings
	$('#settings-button-save').on('click', function() {

		setSettings([
				//{key: 'preset_balance', value: parseFloat( $('#settings-preset_balance').val() ) },//TODO
				{key: 'ui_money_format', value: $('#settings-ui_money_format').val() },
				{key: 'sync_enabled', value: $('#settings-sync_enabled').is(':checked') },
				{key: 'sync_startup', value: $('#settings-sync_startup').is(':checked') }
			]);

		expApp.addNotification({
			title: 'Settings saved',
			message: 'Some settings require a reload.',
			hold: 1000
		});
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
		if( $(e.target).hasClass('sortable') ) {

			$$('.toggle-sortable i').addClass('ion-ios7-checkmark-outline').removeClass('ion-ios7-drag');
			$('#settings-categories-list label.label-checkbox').removeClass('disabled');
		}
	});
	$$('.list-block.sortable').on('close', function (e) {

		// trigger events only when targeted on sorting list (prevent action when swiping on list elements)
		if( $(e.target).hasClass('sortable') ) {

			$$('.toggle-sortable i').addClass('ion-ios7-drag').removeClass('ion-ios7-checkmark-outline');
			$('#settings-categories-list label.label-checkbox').addClass('disabled');

			// save list and its order
			$('#settings-categories-list li').each( function (index) {

				if( $(this).is('[data-uniqueid]') ) {

					var catID = $(this).attr('data-uniqueid');
					var newDisabled = !( $(this).find('#cat-' + catID).is(':checked') );
					var newOrder = index+1;

					db.update('category',
						{uniqueid: catID},
						function(row) {
							row.disabled = newDisabled;
							row.order = newOrder;
							row.synchronized = false;
							row.lastupdate = Date.now();
							return row;
						});
					db.commit();
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
		if( $(e.target).hasClass('sortable') ) {

			$$('.toggle-sortable i').addClass('ion-ios7-checkmark-outline').removeClass('ion-ios7-drag');
			$('#settings-accounts-list label.label-checkbox').removeClass('disabled');
		}
	});
	$$('.list-block.sortable').on('close', function (e) {

		// trigger events only when targeted on sorting list (prevent action when swiping on list elements)
		if( $(e.target).hasClass('sortable') ) {

			$$('.toggle-sortable i').addClass('ion-ios7-drag').removeClass('ion-ios7-checkmark-outline');
			$('#settings-accounts-list label.label-checkbox').addClass('disabled');

			// save list and its order
			$('#settings-accounts-list li').each( function (index) {

				if( $(this).is('[data-uniqueid]') ) {

					var catID = $(this).attr('data-uniqueid');
					var newDisabled = !( $(this).find('#cat-' + catID).is(':checked') );
					var newOrder = index+1;

					db.update('account',
						{uniqueid: catID},
						function(row) {
							row.disabled = newDisabled;
							row.order = newOrder;
							row.synchronized = false;
							row.lastupdate = Date.now();
							return row;
						});
					db.commit();
				}
			});

			// recalculate the total balance on index page
			// because disabling/enabling accounts influences the total balance
			pageIndex.trigger();
		}
	});
});





//////////////////////////////////////////////////////////////////
// APPLICATION STARTUP                                          //
//////////////////////////////////////////////////////////////////

// globals
window.blockedInput = false;

// finally initialize app
expApp.init();

// check if dropbox sync on startup is enabled
if( getSettings('sync_enabled') && getSettings('sync_startup') )
	syncInit();

// debug output of DB content if debug is enabled
if(properties.debug)
	console.debug("DB content: ", JSON.parse(db.serialize()) );
