/* Magic Mirror
 * Fetcher
 *
 * By Michael Teeuw http://michaelteeuw.nl edited for Todoist by Chris Brooker
 *
 * MIT Licensed.
 */

var request = require("request");

/* Fetcher
 * Responsible for requesting an update on the set interval and broadcasting the data.
 *
 */

var Fetcher = function(config) {
    var self = this;
    self.config = config.config;

    var reloadTimer = null;
    var reloadInterval = self.config.updateInterval;

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
                url: self.config.apiBase + "/" + self.config.apiVersion + "/" + self.config.todoistEndpoint,
                method: "POST",
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    'cache-control': 'no-cache'
                },
                form: {
                    token: self.config.accessToken,
                    sync_token: '*',
                    resource_types: self.config.todoistResourceType
                }
            },
            function(error, response, body) {
                if (error) { console.error(" ERROR - MMM-Todoist: " + error); }
                if (!error && response.statusCode == 200) {

                    var items = [];
                    todostResp = JSON.parse(body);

                    //Filter the Todos by the Projects specified in the Config
                    todostResp.items.forEach(function(item) {
                        self.config.projects.forEach(function(project) {
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
                        var itemA = a.item_order,
                            itemB = b.item_order;
                        return itemA - itemB;
                    });

                    todostResp.items = items;
                    self.todostResp = todostResp;

                    self.broadcastItems();
                }
                scheduleTimer();
            });

    };

    /* scheduleTimer()
     * Schedule the timer for the next update.
     */
    var scheduleTimer = function() {
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
        // console.log("Starting Fetcher");
        fetchTodos();
    };

    /* broadcastItems()
     * Broadcast the exsisting items.
     */
    this.broadcastItems = function() {
        if (todostResp == null) {
            // console.log('No items to broadcast yet.');
            return;
        }
        // console.log('Broadcasting ' + todostResp.items.length + ' items.');
        itemsReceivedCallback(self);
    };

    this.onReceive = function(callback) {
        itemsReceivedCallback = callback;
    };

    this.onError = function(callback) {
        fetchFailedCallback = callback;
    };

    this.todostResponse = function() {
        return todostResp;
    };
};

module.exports = Fetcher;