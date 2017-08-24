/* Magic Mirror
 * Fetcher
 *
 *
 * By Michael Teeuw http://michaelteeuw.nl edited for Todoist by Chris Brooker
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

var Fetcher = function(projects, reloadInterval, accessToken) {
    var self = this;
    if (reloadInterval < 1000) {
        reloadInterval = 1000;
    }

    var reloadTimer = null;
    var todostResp = null;
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
                    resource_types: '["items", "projects"]'
                }
            },
            function(error, response, body) {
                if (!error && response.statusCode == 200) {

                    todostResp = JSON.parse(body);

                    var items = [];

                    //Filter the Todos by the Projects specified in teh Config
                    todostResp.items.forEach(function(item) {
                        projects.forEach(function(project) {
                            if (item.project_id == project) {
                                items.push(item);
                            }
                        });
                    });

                    //Used for ordering by date
                    items.forEach(function(item) {
                        if (item.due_date_utc === null) {
                            item.due_date_utc = "Fri 31 Dec 2100 23:59:59 +0000";
                        }
                        //Not used right now
                        item.ISOString = new Date(item.due_date_utc.substring(4, 15).concat(item.due_date_utc.substring(15, 23))).toISOString();
                    });

                    //Sort Todos by Todoist ordering
                    items.sort(function(a, b) {
                        var dateA = new Date(a.item_order),
                            dateB = new Date(b.item_order);
                        return dateA - dateB;
                    });

                    todostResp.items = items;

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
        if (todostResp != null) {
            //console.log('No items to broadcast yet.');
            return;
        }
        //console.log('Broadcasting ' + items.length + ' items.');
        console.log(todostResp);
        itemsReceivedCallback(self);
    };

    this.onReceive = function(callback) {
        itemsReceivedCallback = callback;
    };

    this.onError = function(callback) {
        fetchFailedCallback = callback;
    };

    // this.id = function() {
    //     return listID;
    // };

    this.todostResp = function() {
        return todostResp;
    };
};

module.exports = Fetcher;