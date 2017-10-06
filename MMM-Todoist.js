/* global Module */

/* Magic Mirror
 * Module: MMM-Todoist
 *
 * By Chris Brooker
 * 
 * MIT Licensed.
 */

Module.register("MMM-Todoist", {

    defaults: {
        maximumEntries: 10,
        projects: ["inbox"],
        updateInterval: 10 * 60 * 1000, // every 10 minutes,
        fade: true,
        fadePoint: 0.25,
        sortByDate: false,
        showProject: true,
        projectColors: ["#95ef63", "#ff8581", "#ffc471", "#f9ec75", "#a8c8e4", "#d2b8a3", "#e2a8e4", "#cccccc", "#fb886e",
            "#ffcc00", "#74e8d3", "#3bd5fb", "#dc4fad", "#ac193d", "#d24726", "#82ba00", "#03b3b2", "#008299",
            "#5db2ff", "#0072c6", "#000000", "#777777"
        ], //These colors come from Todoist and their order matters if you want the colors to match your Todoist project colors.

        //This has been designed to use the Todoist Sync API.
        apiVersion: "v7",
        apiBase: "https://todoist.com/api",
        todoistEndpoint: "sync",
        todoistResourceType: '["items", "projects"]'

    },

    // Define required scripts.
    getStyles: function() {
        return ["MMM-Todoist.css"];
    },
    getTranslations: function() {
        return {
            en: "translations/en.json",
            de: "translations/de.json"
        }
    },

    start: function() {
        Log.info("Starting module: " + this.name);

        this.Todoist = [];
        this.loaded = false;

        if (this.config.accessToken === "") {
            Log.error(" MMM-Todoist: AccessToken not set!");
            return;
        }

        //Support legacy properties
        if (this.config.lists !== undefined) {
            if (this.config.lists.length > 0) {
                this.config.projects = this.config.lists;
            }
        }

        this.startFetching();
    },

    /* startFetching()
     * Kicks off the fetching of Todo's through the Node Backend.
     * Required to avoid CORS issues as Todoist uses POSTs.
     */
    startFetching: function() {
        this.sendSocketNotification("START_TODOIST", {
            config: this.config
        });
    },

    // Override socket notification handler.
    socketNotificationReceived: function(notification, payload) {
        if (notification === "TASKS") {
            this.tasks = payload;
            this.updateDom(3000);
        }
    },

    getTodoistData: function() {
        if (this.tasks != undefined) {
            if (this.tasks.items != undefined) {
                this.tasks.items = this.tasks.items.slice(0, this.config.maximumEntries);
            }
        }
        return this.tasks;
    },

    getDom: function() {
        var table = document.createElement("table");
        table.className = "normal small light";

        var todoist = this.getTodoistData();

        if (todoist === undefined) {
            return table;
        }

        for (var i = 0; i < todoist.items.length; i++) {
            var row = document.createElement("tr");
            table.appendChild(row);

            var priorityCell = document.createElement("td");
            switch (todoist.items[i].priority) {
                case 4:
                    priorityCell.className = "priority priority1";
                    break;
                case 3:
                    priorityCell.className = "priority priority2";
                    break;
                case 2:
                    priorityCell.className = "priority priority3";
                    break;
            }
            priorityCell.innerHTML = "";
            row.appendChild(priorityCell);

            var spacerCell = document.createElement("td");
            spacerCell.className = "spacerCell";
            spacerCell.innerHTML = "";
            row.appendChild(spacerCell);

            var todoCell = document.createElement("td");
            todoCell.className = "title bright alignLeft";
            todoCell.innerHTML = todoist.items[i].content;
            row.appendChild(todoCell);

            var dueDateCell = document.createElement("td");
            dueDateCell.className = "bright ";

            var oneDay = 24 * 60 * 60 * 1000;
            var dueDate = new Date(todoist.items[i].due_date_utc);
            var diffDays = Math.floor((dueDate - new Date()) / (oneDay));
            var months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

            switch (diffDays) {
                case -1:
                    dueDateCell.innerHTML = this.translate("YESTERDAY");
                    dueDateCell.className += "xsmall overdue";
                    break;
                case 0:
                    dueDateCell.innerHTML = this.translate("TODAY");
                    dueDateCell.className += "today";
                    break;
                case 1:
                    dueDateCell.innerHTML = this.translate("TOMORROW");
                    dueDateCell.className += "xsmall tomorrow";
                    break;
            }

            if (dueDateCell.innerHTML == "") {
                dueDateCell.innerHTML = this.translate(months[dueDate.getMonth()]) + ' ' + dueDate.getDate();
                if (diffDays < -1) {
                    dueDateCell.className += "xsmall overdue";
                }
                if (diffDays > 1000) {
                    dueDateCell.innerHTML = "";
                }
            }
            row.appendChild(dueDateCell);

            //ShowProject
            if (this.config.showProject) {
                var spacerCell2 = document.createElement("td");
                spacerCell2.className = "spacerCell";
                spacerCell2.innerHTML = "";
                row.appendChild(spacerCell2);

                var project = todoist.projects.find(p => p.id === todoist.items[i].project_id);
                var projectcolor = this.config.projectColors[project.color];
                var projectCell = document.createElement("td");
                projectCell.className = "xsmall";
                projectCell.innerHTML = project.name + "<span class='projectcolor' style='color: " + projectcolor + "; background-color: " + projectcolor + "'></span>";
                row.appendChild(projectCell);
            }

            // Create fade effect by MichMich (MIT)
            if (this.config.fade && this.config.fadePoint < 1) {
                if (this.config.fadePoint < 0) {
                    this.config.fadePoint = 0;
                }
                var startingPoint = todoist.items.length * this.config.fadePoint;
                var steps = todoist.items.length - startingPoint;
                if (i >= startingPoint) {
                    var currentStep = i - startingPoint;
                    todoCell.style.opacity = 1 - (1 / steps * currentStep);
                }
            }
            // End Create fade effect by MichMich (MIT)
        }

        return table;
    }

});