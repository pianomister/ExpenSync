/***********************************
 * ExpenSync                       *
 *                                 *
 * EXPENSES-STATS.JS               *
 * Statistical functions and       *
 * charting functionality          *
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
  for(var i = 0; i < allAccounts.length; i++) {
    if(allAccounts[i].disabled)
      disabledAccounts.push(allAccounts[i].uniqueid);
    else
      totalBalance += allAccounts[i].initial_balance;
  }

  var activeItems = db.queryAll('item', {
      query: function(row) {
        if(!row.deleted && disabledAccounts.indexOf(row.account) === -1)
          return true;
        else
          return false;
      }
    });
  for(var i = 0; i < activeItems.length; i++) {
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

  var accItems = db.queryAll('item', {query: {account: accountID, deleted: false}});
  var accInitBalance = getAccounts(accountID).initial_balance;
  var accBalance = 0;

  for(var i = 0; i < accItems.length; i++) {
    accBalance += accItems[i].price;
  }

  return accBalance + accInitBalance;
}
