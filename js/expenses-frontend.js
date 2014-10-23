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



// create app object
var expApp = new Framework7({
	init: false, // disabled so page callbacks for initial pages work
	modalTitle: 'ExpenSync',
	notificationCloseOnClick: true
});

// Export selectors engine
var $$ = Dom7;

// Load DB
// Initialise. If the database doesn't exist, it is created
var db = new localStorageDB("expenSync", localStorage);

// Check if the database was just created. Then create all tables
if( db.isNew() ) {

	// create 'settings' table
	var settings_rows = [
		{key: 'preset_balance', value: 0, description: 'Initial balance'},
		{key: 'ui_lang', value: 'EN', description: 'Language'},
		{key: 'ui_money_format', value: 'comma', description: 'Money Format'},
		{key: 'sync_enabled', value: true, description: 'Sync enabled'},
		{key: 'sync_startup', value: false, description: 'Sync on startup'},
		{key: 'sync_continuous', value: true, description: 'Sync continuously or only manually'},
		{key: 'sync_lastupdate', value: 1, description: 'Timestamp of last sync'}
	];
    db.createTableWithData('settings', settings_rows);

    // create 'category' table
    db.createTable("category", ["timestamp", "lastupdate", "description", "icon", "order", "disabled"]);

	dateNow = Date.now();
	_categories = ["Other", "Groceries", "Canteen", "Eating Out", "Fun", "Clothing", "Car", "Transport", "Travel", "Household", "Salary", "Finance", "Medical", "Education", "Rent / Loan", "Communication"];
	_cat_icons  = ["ion-ios7-more", "ion-ios7-cart", "ion-fork", "ion-ios7-wineglass", "ion-ios7-musical-notes", "ion-ios7-pricetags", "ion-model-s", "ion-plane", "ion-map", "ion-ios7-home", "ion-ios7-briefcase", "ion-cash", "ion-ios7-medkit", "ion-university", "ion-ios7-home", "ion-ios7-telephone"];

	for(i = 0; i < _categories.length; i++) {

		db.insert("category", {
			timestamp: i,
			lastupdate: i,
			description: _categories[i],
			icon: _cat_icons[i],
			order: i+1,
			disabled: false
		});
	}

	// create "item" table
    db.createTable("item", ['uniqueid', "timestamp", "lastupdate", "category", "price", "description", "deleted"]);

    db.commit();
}



/**
 * create a unique ID for items based on time, a given salt and browser's user agent
 */
function createUniqueid(timestamp, salt) {

	return calcMD5(timestamp + salt + navigator.userAgent);
}



/**
 * returns a price, suitable colored and currency format
 */
function formatPrice(price) {

	colorClass = 'green';
	if(price < 0)
		colorClass = 'red';

	formattedPrice = parseFloat(price).toFixed(2);

	// get number format from settings
	money_format = db.query('settings', {key: 'ui_money_format'});
	if(money_format[0].value == 'comma')
		formattedPrice = formattedPrice.replace('.', ',');

	return '<span class="color-' + colorClass + '">' + formattedPrice + '</span>';
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
 * @param {boolean} appendZero true if entry with ID 0 (= All) should be prepended
 */
function createCategoryOptions(domElement, selectedID, appendZero) {

	selectedID = selectedID || false;
	appendZero = appendZero || false;
	var $list = $(domElement);

	// empty dropdown list
	$list.empty();

	// if zero element should be appended
	if(appendZero)
	$list.append(
		$('<option>').val(0).text('All')
	);

	var categories = db.query('category');

	for(i = 0; i < categories.length; i++) {

		var $option = $('<option>').val(categories[i].ID).text(categories[i].description)

		// select entry if defined
		if(selectedID && selectedID == categories[i].ID)
			$option.attr('selected', 'selected');

		$list.append( $option );
	}
}



/**
 * Validates and formats fields from add/edit item forms
 *
 * @return false if invalid, else an object with validated and formatted values
 */
function validateItemForm(price, category, description, date, deleted) {

	var validPrice, validCategory, validDescription, validDate, validDeleted;
	deleted = deleted || false;

	// check if minimum input (price) is given
	if(price != 0 && price != null && parseFloat(price) != NaN && price.length != 0) {

		validPrice = parseFloat(price);
		validCategory = parseInt(category);
		validDescription = description;
		validDeleted = (deleted == 'true');

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
			deleted: validDeleted
		};

		return returnObj;

	} else {
		expApp.alert('Please fill in a cost.');
	}

	return false;
}



function createItemListElements(domList, itemQuery, itemSort, itemLimit, domBalance) {

	domBalance = domBalance || false;
	$list = $('<div />');
	$balance = $(domBalance);

	// calculate list balance
	var listBalance = 0;

	// get categories
	var _category = db.queryAll('category', {sort: [['ID', 'ASC']]});

	// get items according to request params
	items = db.queryAll('item', { query: itemQuery,
								  sort: itemSort,
								  limit: itemLimit
								});

	// add items to expenses list
	for(i = 0; i < items.length; i++) {

		var row = items[i];
		var rowCategory = _category[row.category-1];
		var description = row.description;
		var category = ' | ' + rowCategory.description;

		if(description == null || description.length == 0) {
			description = '<span class="color-gray">' + rowCategory.description + '</span>';
			category = '';
		}

		$list.append(
			'<li class="swipeout" data-uniqueid="' + row.uniqueid + '">' +
			'	<div class="swipeout-content item-content">' +
			'		<div class="item-media">' +
			'			<span class="icon-wrap"><i class="color-black icon ion ' + rowCategory.icon + '"></i></span>' +
			'		</div>' +
			'		<div class="item-inner">' +
			'			<div class="item-title-row">' +
			'				<div class="item-title">' + description + '</div>' +
			'				<div class="item-after">' + formatPrice(row.price) + '</div>' +
			'			</div>' +
			'			<div class="item-subtitle color-gray">' + formatDate(row.timestamp) + category + '</div>' +
			'		</div>' +
			'	</div>' +
			'	<div class="swipeout-actions-right">' +
			'		<a href="" class="edit-item" data-uniqueid="' + row.uniqueid + '">Edit</a>' +
			'		<a class="swipeout-delete swipeout-overswipe" data-confirm="Are you sure that you want to delete this item?" href="">Delete</a>' +
			'	</div>' +
			'</li>'
		);

		// add cost to list balance
		listBalance += row.price;
	}

	//flush list to DOM element
	$(domList).html( $list.html() );

	// output list balance
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
		createCategoryOptions( $('.popup-edit-item #form-edit-category'), editItem.category );

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

				// TODO refactoring: mit validierung von form-add zusammenlegen
				var newPrice = $('.popup-edit-item #form-edit-price').val();
				var newCategory = $('.popup-edit-item #form-edit-category').val();
				var newDescription = $('.popup-edit-item #form-edit-description').val();
				var newDate = $('.popup-edit-item #form-edit-date').val();
				var newDeleted = $('.popup-edit-item').attr('data-deleted');

				var validItem = validateItemForm(newPrice, newCategory, newDescription, newDate, newDeleted);

				if(validItem) {

					db.update('item', {uniqueid: editID},
						function(row) {
							row.price = validItem.price;
							row.category = validItem.category;
							row.description = validItem.description;
							row.timestamp = validItem.date;
							row.deleted = validItem.deleted;
							row.lastupdate = Date.now();
							return row;
						});
					db.commit();
					console.log( db.query('item',{uniqueid:editID})[0].lastupdate - Date.now() );//TODO
				}

				expApp.closeModal('.popup-edit-item');

				//TODO re-render list and menu to update everything
				pageIndexLeft.trigger();
				pageIndex.trigger();
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
				return row;
			});
		db.commit();
		delItem = db.query('item', {uniqueid: delID});

		// get category description
		delItemCategory = db.query('category', {ID: delItem[0].category});

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

// debug output of DB content if debug is enabled
if(properties.debug)
	console.debug("DB content: ", JSON.parse(db.serialize()) );



// Add views
var leftView = expApp.addView('.view-left', {
    // Because we use fixed-through navbar we can enable dynamic navbar
    dynamicNavbar: true
});
var mainView = expApp.addView('.view-main', {
    // Because we use fixed-through navbar we can enable dynamic navbar
    dynamicNavbar: true
});



/* ===== Menu index left ===== */
pageIndexLeft = expApp.onPageInit('index-left', function (page) {

	// generate links to expenses in menu
	currentMonth = (new Date()).getMonth();
	currentYear = (new Date()).getFullYear();
	startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0); // zero values for hours
	endDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);

	$('#menu-list').empty();
	entriesAvailable = false;

	for(i = 15; i >= 0; i--) {

		startDate.setFullYear(currentYear, currentMonth);
		endDate.setFullYear(currentYear, currentMonth+1);

		// create menu link label and data object (is given to expenses page)
		// data object contains information which list to show
		monthLabel = i18n.month[currentMonth] + ' ' + currentYear;
		dataObj = {
			request: 'timerange', // TODO others: lastupdate, latest, deleted
			start: startDate.getTime(),
			end: endDate.getTime(),
			title: monthLabel
		};

		// get items for current month
		monthBalance = 0;
		monthItems = db.query('item',
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
			for(j = 0; j < monthItems.length; j++) {
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



/* ===== Index overview ===== */
pageIndex = expApp.onPageInit('index index-1', function (page) {

	// assume main view if page is not defined
	page = page || {container:'.view-main'};

	// add categories to dropdown select
	createCategoryOptions( $(page.container).find('#form-add-category') );

	// add expense form: submit handler
	$(page.container).find('#form-add-submit').on('click', function(e) {

		// disable button to prevent multiple entries (by accident)
		that = $( e.target );
		that.addClass('disabled');
		window.setTimeout(function() {
			that.removeClass('disabled');
		}, 1000);

		addPrice = $(page.container).find('#form-add-price').val();
		addCategory = $(page.container).find('#form-add-category').val();
		addDescription = $(page.container).find('#form-add-description').val();
		addDate = $(page.container).find('#form-add-date').val();

		var validItem = validateItemForm(addPrice, addCategory, addDescription, addDate, false);

		if(validItem) {

			// insert new item in DB
			addID = db.insert('item', {
				uniqueid: createUniqueid( Date.now(), addDate+addDescription+addPrice+addCategory ),
				timestamp: validItem.date,
				lastupdate: Date.now(),
				category: validItem.category,
				price: validItem.price,
				description: validItem.description,
				deleted: false
			});
			db.commit();

			addCategoryDescription = db.query('category', {ID: addCategory});

			notificationDescription = '';
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
	});

	// hide sync options if disabled
	if( !getSettings('sync_enabled') )
		$('.index-sync').html('<p>You can synchronize all expenses with your Dropbox. Enable Synchronization in <a href="settings.html" data-view=".view-left" class="open-panel">settings</a>.</p>');

	// calculate balances
	// total balance
	allItems = db.query('item', {deleted: false});
	presetBalance = db.query('settings', {key: 'preset_balance'});
	totalBalance = presetBalance[0].value;//TODO get initial value from settings
	for(i = 0; i < allItems.length; i++) {
		totalBalance += allItems[i].price;
	}
	$(page.container).find('#total-balance').html( formatPrice(totalBalance) );

	// current month's balance
	currentMonth = (new Date()).getMonth();
	currentYear = (new Date()).getFullYear();
	startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
	endDate = new Date(currentYear, currentMonth+1, 0, 0, 0, 0, 0);

	currentItems = db.queryAll('item', {
			query: function(row) {
				if(!row.deleted &&
					row.timestamp >= startDate.getTime() &&
					row.timestamp < endDate.getTime())
					return true;
				else
					return false;
			}
		});
	currentBalance = 0;
	for(i = 0; i < currentItems.length; i++) {
		currentBalance += currentItems[i].price;
	}
	$(page.container).find('#total-balance-month').html( formatPrice(currentBalance) );

	// last month's total balance
	lastBalance = totalBalance - currentBalance;
	$(page.container).find('#total-balance-lastmonth').html( formatPrice(lastBalance) );
});


/* ===== expenses-list ===== */
expApp.onPageInit('expenses-list', function (page) {

	//TODO
	console.debug(page.query);

	// add categories to dropdown select
	createCategoryOptions( $(page.container).find('#expenses-list-category'), false, true );

	// category select dropdown
	/*$(page.container).find('#expenses-list-category').on('change', function(e) {

		var catID = $(e.delegateTarget).val();

		page.query.category = catID;
		mainView.loadPage('expenses-list.html?' + $.param(page.query));
	});*/

	// evaluate page params to determine what to display
	// standard values
	itemQuery = {deleted: false};
	itemSort = [['timestamp', 'DESC']];
	itemLimit = null;

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
	createItemListElements( $(page.container).find('#expenses-list-items'), itemQuery, itemSort, itemLimit, $(page.container).find('#expenses-list-balance') );

});






/* ===== settings ===== */
expApp.onPageInit('settings', function (page) {

	// load settings
	settings_rows = db.query('settings');
	settings = [];

	for(i = 0; i < settings_rows.length; i++) {

		settings[ settings_rows[i].key ] = settings_rows[i].value;
	}

	$('#settings-preset_balance').val( settings['preset_balance'] );
	$('#settings-ui_money_format').find('option[value="' + settings['ui_money_format'] + '"]').attr('selected', 'selected');

	if(settings['sync_enabled'])
		$('#settings-sync_enabled').prop('checked', 'checked');

	if(settings['sync_startup'])
		$('#settings-sync_startup').prop('checked', 'checked');


	// save settings
	$('#settings-button-save').on('click', function() {

		db.update('settings',
			{key: 'preset_balance'},
			function(row) {
				row.value = parseFloat( $('#settings-preset_balance').val() );
				return row;
			});
		db.update('settings',
			{key: 'ui_money_format'},
			function(row) {
				row.value = $('#settings-ui_money_format').val();
				return row;
			});
		db.update('settings',
			{key: 'sync_enabled'},
			function(row) {
				row.value = $('#settings-sync_enabled').is(':checked');
				return row;
			});
		db.update('settings',
			{key: 'sync_startup'},
			function(row) {
				row.value = $('#settings-sync_startup').is(':checked');
				return row;
			});
		db.commit();

		expApp.addNotification({
			title: 'Settings saved',
			message: 'Some settings require a reload.',
			hold: 1000
		});
	});
});






/* ===== Settings Categories ===== */
expApp.onPageInit('settings-categories', function (page) {

	_category = db.queryAll('category', {sort: [['ID', 'DESC']]});

	for(i = 0; i < _category.length; i++) {

		cat = _category[i];

		checked = cat.disabled ? '' : ' checked="checked"';

		$('#settings-categories-list').prepend(
			'<li class="swipeout" data-uniqueid="' + cat.ID + '">' +
			'	<label class="label-checkbox swipeout-content item-content">' +
			'		<input type="checkbox" value="' + cat.ID + '"' + checked + '>' +
			'		<div class="item-media">' +
			'			<i class="icon icon-form-checkbox"></i>' +
			'		</div>' +
			'		<div class="item-inner">' +
			'			<div class="item-title">' + cat.description + '</div>' +
			'			<div class="item-after">' +
			'				<i class="icon ion ' + cat.icon + '"></i>' +
			'			</div>' +
			'		</div>' +
			'	</label>' +
			'	<div class="sortable-handler"></div>' +
			'	<div class="swipeout-actions-right">' +
			'		<a href="#">Edit</a>' +
			'	</div>' +
			'</li>'
		);
	}

    // Sortable toggler
    $$('.list-block.sortable').on('open', function () {
        $$('.toggle-sortable i').addClass('ion-ios7-checkmark-outline').removeClass('ion-ios7-drag');
    });
    $$('.list-block.sortable').on('close', function () {
        $$('.toggle-sortable i').addClass('ion-ios7-drag').removeClass('ion-ios7-checkmark-outline');
    });
});



function createContentPage() {
    mainView.loadContent(
        '<!-- Top Navbar-->' +
        '<div class="navbar">' +
        '  <div class="navbar-inner">' +
        '    <div class="left"><a href="#" class="back link">Back</a></div>' +
        '    <div class="center sliding">Dynamic Page ' + (++dynamicPageIndex) + '</div>' +
        '  </div>' +
        '</div>' +
        '<div class="pages">' +
        '  <!-- Page, data-page contains page name-->' +
        '  <div data-page="dynamic-content" class="page">' +
        '    <!-- Scrollable page content-->' +
        '    <div class="page-content">' +
        '      <div class="content-block">' +
        '        <div class="content-block-inner">' +
        '          <p>Here is a dynamic page created on ' + new Date() + ' !</p>' +
        '          <p>Go <a href="#" class="back">back</a> or generate <a href="#" class="ks-generate-page">one more page</a>.</p>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>'
    );
    return;
}



// STARTUP //

// finally initialize app
expApp.init();

// check if dropbox sync on startup is enabled
if( getSettings('sync_startup') )
	syncInit();
