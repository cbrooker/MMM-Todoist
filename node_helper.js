"use strict";

/* Magic Mirror
 * Module: MMM-Todoist
 *
 * By Chris Brooker
 *
 * MIT Licensed.
 */

const NodeHelper = require("node_helper");

let axios;
let showdown;

try {
	axios = require("axios");
} catch (e) {
	axios = null;
	console.error("MMM-Todoist: missing dependency 'axios'. Run 'npm install' in the module folder.", e && e.message);
}

try {
	showdown = require("showdown");
} catch (e) {
	showdown = null;
	console.error("MMM-Todoist: missing dependency 'showdown'. Run 'npm install' in the module folder.", e && e.message);
}

module.exports = NodeHelper.create({
	start: function() {
		console.log("Starting node helper for: " + this.name);
	},

	socketNotificationReceived: function(notification, payload) {
		if (notification === "FETCH_TODOIST") {
			this.config = payload;
			this.fetchTodos();
		}
	},

	fetchTodos : function() {
		var self = this;
		var accessCode = self.config.accessToken;

		if (!axios) {
			console.error("MMM-Todoist: axios is not available. Please run 'npm install' in modules/MMM-Todoist");
			self.sendSocketNotification("FETCH_ERROR", { error: "Missing dependency: axios" });
			return;
		}
		
		if (!accessCode || accessCode === "") {
			console.error("MMM-Todoist: AccessToken not set!");
			self.sendSocketNotification("FETCH_ERROR", {
				error: "AccessToken not configured"
			});
			return;
		}

		const url = "https://api.todoist.com/api/v1/sync";
		const params = new URLSearchParams();
		params.append("sync_token", "*");
		params.append("resource_types", '["*"]');

		axios.post(url, params.toString(), {
			headers: {
				"content-type": "application/x-www-form-urlencoded",
				"cache-control": "no-cache",
				"Authorization": "Bearer " + accessCode
			}
		})
		.then(function(response) {
			if (self.config.debug) {
				console.log("MMM-Todoist API Response:", JSON.stringify(response.data, null, 2));
			}

			if (response.status === 200 && response.data) {
				const taskJson = response.data;
				console.log(taskJson)
				
				if (!taskJson.items || !Array.isArray(taskJson.items)) {
					console.error("MMM-Todoist: Invalid response format - items array missing");
					self.sendSocketNotification("FETCH_ERROR", {
						error: "Invalid response format"
					});
					return;
				}

				let markdownConverter = null;
				if (showdown) {
					markdownConverter = new showdown.Converter();
				}

				taskJson.items.forEach((item) => {
					if (item.content) {
						if (markdownConverter) {
							item.contentHtml = markdownConverter.makeHtml(item.content);
						} else {
							item.contentHtml = item.content;
						}
					}
				});

				taskJson.accessToken = accessCode;
				self.sendSocketNotification("TASKS", taskJson);
			} else {
				console.error("MMM-Todoist: Unexpected response status: " + response.status);
				self.sendSocketNotification("FETCH_ERROR", {
					error: "Unexpected response status: " + response.status
				});
			}
		})
		.catch(function(error) {
			var errorMessage = "Unknown error";
			if (error.response) {
				// The request was made and the server responded with a status code
				// that falls out of the range of 2xx
				errorMessage = "API Error: " + error.response.status + " - " + (error.response.data ? JSON.stringify(error.response.data) : error.message);
				console.error("MMM-Todoist API Error:", error.response.status, error.response.data);
			} else if (error.request) {
				// The request was made but no response was received
				errorMessage = "No response from Todoist API: " + error.message;
				console.error("MMM-Todoist: No response received:", error.message);
			} else {
				// Something happened in setting up the request that triggered an Error
				errorMessage = "Request setup error: " + error.message;
				console.error("MMM-Todoist Request Error:", error.message);
			}
			
			self.sendSocketNotification("FETCH_ERROR", {
				error: errorMessage
			});
		});
	}
});