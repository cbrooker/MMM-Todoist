/* global Module */

/* Magic Mirror
 * Module: MMM-Todoist
 *
 * By Chris Brooker
 * 
 * 		Adapted from MMM-Wonderlist by Paul-Vincent Roll http://paulvincentroll.com
 * 
 * MIT Licensed.
 */

Module.register("MMM-Todoist", {

    defaults: {
        maximumEntries: 10,
        projects: ["inbox"],
        interval: 60,
        fade: true,
        fadePoint: 0.25,
        sortByDate: false,
        showProject: true,
        projectColors: ["#95ef63", "#ff8581", "#ffc471", "#f9ec75", "#a8c8e4", "#d2b8a3", "#e2a8e4", "#cccccc", "#fb886e", "#ffcc00", "#74e8d3", "#3bd5fb", "#dc4fad", "#ac193d", "#d24726", "#82ba00", "#03b3b2", "#008299", "#5db2ff", "#0072c6", "#000000", "#777777"]
    },

    // Define required scripts.
    getStyles: function() {
        return ["MMM-Todoist.css"];
    },

    start: function() {
        this.tasks = [];
        this.sendSocketNotification("CONFIG", this.config);
        this.sendSocketNotification("CONNECTED");
        Log.info("Starting module: " + this.name);
    },

    // Override socket notification handler.
    socketNotificationReceived: function(notification, payload) {
        if (notification === "TASKS") {
            this.tasks = payload;
            this.updateDom(3000);
        } else if (notification === "STARTED") {
            console.log(notification);
            this.sendSocketNotification("addLists", this.config);
        }
    },

    getTodoistData: function() {
        // var tasksShown = [];
        // for (var i = 0; i < this.config.lists.length; i++) {
        //     if (typeof this.tasks.items[this.config.lists[i]] != "undefined") {
        //         var list = this.tasks[this.config.lists[i]];

        //         for (var todo in list) {
        //             tasksShown.push(list[todo]);
        //         }
        //     }
        // }

        // var todost = {};

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
        if (todoist.items === undefined) {
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
            var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            switch (diffDays) {
                case -1:
                    dueDateCell.innerHTML = "Yesterday";
                    dueDateCell.className += "xsmall overdue";
                    break;
                case 0:
                    dueDateCell.innerHTML = "Today";
                    dueDateCell.className += "today";
                    break;
                case 1:
                    dueDateCell.innerHTML = "Tomorrow";
                    dueDateCell.className += "xsmall tomorrow";
                    break;
            }

            if (dueDateCell.innerHTML == "") {
                dueDateCell.innerHTML = months[dueDate.getMonth()] + ' ' + dueDate.getDate();
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
                    table.style.opacity = 1 - (1 / steps * currentStep);
                }
            }
            // End Create fade effect by MichMich (MIT)
        }

        return table;
    }

});