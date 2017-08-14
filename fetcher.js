/* Magic Mirror
 * Fetcher
 *
 *
 * By Michael Teeuw http://michaelteeuw.nl edited for Wunderlist by Paul-Vincent Roll
 * Edited again for Todoist by Chris Brooker
 *
 * MIT Licensed.
 */

var request = require("request");

/* Fetcher
 * Responsible for requesting an update on the set interval and broadcasting the data.
 *
 * attribute listID string - ID of the Wunderlist list.
 * attribute reloadInterval number - Reload interval in milliseconds.
 */

var Fetcher = function(listID, reloadInterval, accessToken, clientID) {
 var self = this;
 if (reloadInterval < 1000) {
	reloadInterval = 1000;
 }

 var reloadTimer = null;
 var items = [];
 var dates = [];
 var fetchFailedCallback = function() {};
 var itemsReceivedCallback = function() {};

 /* private methods */

 /* fetchTodos()
	* Request the new items.
	*/

 var fetchTodos = function() {
	clearTimeout(reloadTimer);
	reloadTimer = null;

	request({
		url: "https://todoist.com/API/v7/sync/",
		method: "POST",
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
			'cache-control': 'no-cache'
		},
		form: {
				token: accessToken,
				sync_token: '*',
				resource_types: '["items"]'
		}
	 },
	 function(error, response, body) {
		if (!error && response.statusCode == 200) {
         items = [];
         duedates = [];  // initialize duedates array
		 for (var i = 0; i < JSON.parse(body).items.length; i++) {
			 if (JSON.parse(body).items[i].project_id == listID) {
				 items.push(JSON.parse(body).items[i].content);
//				 Check if due date in item is null ... no due date
				 if (JSON.parse(body).items[i].due_date_utc === null){
					 duedates.push("Fri 31 Dec 2100 23:59:59 +0000");  // if no due date then set due date to 31 Dec 2100
				 } else {
					 duedates.push(JSON.parse(body).items[i].due_date_utc);  //added parsing to get due date
				 }
			 }
		 }

// added code to reformat due date to make it sortable
		var dates = []; 	//var for reformatted duedates
		var data = [];		//var for data obj to hold todo items and due dates
		for (var i=0; i<duedates.length; i++) {
			dates.push(new Date(duedates[i].substring(4, 15).concat(duedates[i].substring(15, 23))).toISOString());
		}
// code to populate data obj array
		for (i = 0; i<items.length; i++) {
			data.push({date: dates[i], todo: items[i]});
		}
// routine to sort data array by due date
		data.sort(function(a, b){ // sort object by due date
			var dateA=new Date(a.date), dateB=new Date(b.date);
			return dateA-dateB; //sort by date ascending;
		});
// code to repopoulate item list with sorted todos
		items=[]
		for (var key in data){
			items.push(data[key].todo);
		}

		self.broadcastItems();
		scheduleTimer();
		}
	 });

 };

 /* scheduleTimer()
	* Schedule the timer for the next update.
	*/

 var scheduleTimer = function() {
	//console.log('Schedule update timer.');
	clearTimeout(reloadTimer);
	reloadTimer = setTimeout(function() {
	 fetchTodos();
	}, reloadInterval);
 };

 /* public methods */

 /* setReloadInterval()
	* Update the reload interval, but only if we need to increase the speed.
	*
	* attribute interval number - Interval for the update in milliseconds.
	*/
 this.setReloadInterval = function(interval) {
	if (interval > 1000 && interval < reloadInterval) {
	 reloadInterval = interval;
	}
 };

 /* startFetch()
	* Initiate fetchTodos();
	*/
 this.startFetch = function() {
	fetchTodos();
 };

 /* broadcastItems()
	* Broadcast the exsisting items.
	*/
 this.broadcastItems = function() {
	if (items.length <= 0) {
	 //console.log('No items to broadcast yet.');
	 return;
	}
	//console.log('Broadcasting ' + items.length + ' items.');
	itemsReceivedCallback(self);
 };

 this.onReceive = function(callback) {
	itemsReceivedCallback = callback;
 };

 this.onError = function(callback) {
	fetchFailedCallback = callback;
 };

 this.id = function() {
	return listID;
 };

 this.items = function() {
	return items;
 };
};

module.exports = Fetcher;
