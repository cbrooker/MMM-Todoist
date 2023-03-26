/* global Module */

/* Magic Mirror
 * Module: MMM-Todoist
 *
 * By Chris Brooker
 *
 * MIT Licensed.
 */

/*

 * Update by mabahj 24/11/2019
 * - Added support for labels in addtion to projects
 * Update by AgP42 the 18/07/2018
 * Modification added :
 * - Management of a PIR sensor with the module MMM-PIR-Sensor (by PaViRo). In case PIR module detect no user,
 * the update of the ToDoIst is stopped and will be requested again at the return of the user
 * - Management of the "module.hidden" by the core system : same behaviour as "User_Presence" by the PIR sensor
 * - Add "Loading..." display when the infos are not yet loaded from the server
 * - Possibility to add the last update time from server at the end of the module.
 * This can be configured using "displayLastUpdate" and "displayLastUpdateFormat"
 * - Possibility to display long task on several lines(using the code from default module "calendar".
 * This can be configured using "wrapEvents" and "maxTitleLength"
 *
 * // Update 27/07/2018 :
 * - Correction of start-up update bug
 * - correction of regression on commit #28 for tasks without dueDate
 * */

//UserPresence Management (PIR sensor)
var UserPresence = true; //true by default, so no impact for user without a PIR sensor

Module.register("MMM-Todoist", {
  defaults: {
    maximumEntries: 10,
    projects: [], //include all task from these projects regardless of label
    blacklistProjects: false,
    labels: [""], //tasks with these labels will be displayed regardless of project
    updateInterval: 10 * 60 * 1000, // every 10 minutes,
    fade: true,
    fadePoint: 0.25,
    fadeMinimumOpacity: 0.25,
    sortType: "todoist",

    //New config from AgP42
    displayLastUpdate: false, //add or not a line after the tasks with the last server update time
    displayLastUpdateFormat: "dd - HH:mm:ss", //format to display the last update. See Moment.js documentation for all display possibilities
    maxTitleLength: 50, //10 to 50. Value to cut the line if wrapEvents: true
    wrapEvents: false, // wrap events to multiple lines breaking at maxTitleLength
    displayTasksWithoutDue: true, // Set to false to not print tasks without a due date
    displayTasksWithinDays: -1, // If >= 0, do not print tasks with a due date more than this number of days into the future (e.g., 0 prints today and overdue)
    // 2019-12-31 by thyed
    displaySubtasks: true, // set to false to exclude subtasks

    //colorMap taken from https://developer.todoist.com/guides/#colors
    //names needed for project colors
    colorMap: [
      { id: 30, name: "berry_red", hex: "#b8256f" },
      { id: 31, name: "red", hex: "#db4035" },
      { id: 31, name: "orange", hex: "#ff9933" },
      { id: 33, name: "yellow", hex: "#fad000" },
      { id: 34, name: "olive_green", hex: "#afb83b" },
      { id: 35, name: "lime_green", hex: "#7ecc49" },
      { id: 36, name: "green", hex: "#299438" },
      { id: 37, name: "mint_green", hex: "#6accbc" },
      { id: 38, name: "teal", hex: "#158fad" },
      { id: 39, name: "sky_blue", hex: "#14aaf5" },
      { id: 40, name: "light_blue", hex: "#96c3eb" },
      { id: 41, name: "blue", hex: "#4073ff" },
      { id: 42, name: "grape", hex: "#884dff" },
      { id: 43, name: "violet", hex: "#af38eb" },
      { id: 44, name: "lavender", hex: "#eb96eb" },
      { id: 45, name: "magenta", hex: "#e05194" },
      { id: 46, name: "salmon", hex: "#ff8d85" },
      { id: 47, name: "charcoal", hex: "#808080" },
      { id: 48, name: "grey", hex: "#b8b8b8" },
      { id: 49, name: "taupe", hex: "#ccac93" }
    ],

    //This has been designed to use the Todoist Sync API.
    apiVersion: "v9",
    apiBase: "https://todoist.com/API",
    todoistEndpoint: "sync",

    todoistResourceType:
      '["items", "projects", "collaborators", "user", "labels"]',

    debug: true,

    //display these columns in this order; all are optional
    displayOrder: [
      "content",
      "duedate",
      "countdown",
      "priority",
      "labels",
      "assignee",
      "avatar",
      "project"
    ],
    //taken from Todoist
    priorityColors: {
      1: "#333333",
      2: "#246fe0",
      3: "#eb8909",
      4: "#d1453b"
    },
    displayProjectAs: "both", //"name" excludes color border surrounding project name, "color" excludes the project name (anything else = "both" project name and project color border around name)
    displayColumnHeadings: "icons", //"text", "icons", "none" --using column text makes table significantly wider
    tasks: false //not user adjustable, this is where the template data is stored
  },

  // Define required scripts.
  getTemplate: function () {
    return "baseTemplate.njk";
  },
  getTemplateData: function () {
    return this.config;
  },

  getStyles: function () {
    return ["MMM-Todoist.css"];
  },
  getTranslations: function () {
    return {
      en: "translations/en.json",
      de: "translations/de.json",
      nb: "translations/nb.json"
    };
  },

  start: function () {
    var self = this;
    Log.info("Starting module: " + this.name);

    this.updateIntervalID = 0; // Definition of the IntervalID to be able to stop and start it again
    this.ModuleToDoIstHidden = false; // by default it is considered displayed. Note : core function "this.hidden" has strange behaviour, so not used here

    //to display "Loading..." at start-up
    this.title = "Loading...";
    this.loaded = false;

    if (this.config.accessToken === "") {
      Log.error("MMM-Todoist: AccessToken not set!");
      return;
    }

    //Support legacy properties
    if (this.config.lists !== undefined) {
      if (this.config.lists.length > 0) {
        this.config.projects = this.config.lists;
      }
    }

    // keep track of user's projects list (used to build the "whitelist")
    this.userList =
      typeof this.config.projects !== "undefined"
        ? JSON.parse(JSON.stringify(this.config.projects))
        : [];

    this.sendSocketNotification("FETCH_TODOIST", this.config);

    //add ID to the setInterval function to be able to stop it later on
    this.updateIntervalID = setInterval(function () {
      self.sendSocketNotification("FETCH_TODOIST", self.config);
    }, this.config.updateInterval);
  },

  suspend: function () {
    //called by core system when the module is not displayed anymore on the screen
    this.ModuleToDoIstHidden = true;
    //Log.log("Fct suspend - ModuleHidden = " + ModuleHidden);
    this.GestionUpdateIntervalToDoIst();
  },

  resume: function () {
    //called by core system when the module is displayed on the screen
    this.ModuleToDoIstHidden = false;
    //Log.log("Fct resume - ModuleHidden = " + ModuleHidden);
    this.GestionUpdateIntervalToDoIst();
  },

  notificationReceived: function (notification, payload) {
    if (notification === "USER_PRESENCE") {
      // notification sended by module MMM-PIR-Sensor. See its doc
      //Log.log("Fct notificationReceived USER_PRESENCE - payload = " + payload);
      UserPresence = payload;
      this.GestionUpdateIntervalToDoIst();
    }
  },

  GestionUpdateIntervalToDoIst: function () {
    if (UserPresence === true && this.ModuleToDoIstHidden === false) {
      var self = this;

      // update now
      this.sendSocketNotification("FETCH_TODOIST", this.config);

      //if no IntervalID defined, we set one again. This is to avoid several setInterval simultaneously
      if (this.updateIntervalID === 0) {
        this.updateIntervalID = setInterval(function () {
          self.sendSocketNotification("FETCH_TODOIST", self.config);
        }, this.config.updateInterval);
      }
    } else {
      //if (UserPresence = false OR ModuleHidden = true)
      Log.log(
        "Personne regarde : on stop l'update " +
          this.name +
          " projet : " +
          this.config.projects
      );
      clearInterval(this.updateIntervalID); // stop the update interval of this module
      this.updateIntervalID = 0; //reset the flag to be able to start another one at resume
    }
  },

  // Override socket notification handler.
  // ******** Data sent from the Backend helper. This is the data from the Todoist API ************
  socketNotificationReceived: function (notification, payload) {
    if (notification === "TASKS") {
      if (this.config.debug) {
        Log.info(payload);
      }
      this.config.tasks = this.filterTodoistData(payload);

      if (this.config.displayLastUpdate) {
        this.lastUpdate = Date.now() / 1000; //save the timestamp of the last update to be able to display it
        Log.log(
          "ToDoIst update OK, project : " +
            this.config.projects +
            " at : " +
            moment
              .unix(this.lastUpdate)
              .format(this.config.displayLastUpdateFormat)
        ); //AgP
      }

      this.loaded = true;
      this.updateDom(1000);
    } else if (notification === "FETCH_ERROR") {
      Log.error("Todoist Error. Could not fetch todos: " + payload.error);
    }
  },

  filterTodoistData: function (tasks) {
    var self = this;
    var items = [];
    var labelIds = [];

    if (tasks == undefined) {
      return;
    }
    if (tasks.accessToken != self.config.accessToken) {
      return;
    }
    if (tasks.items == undefined) {
      return;
    }

    if (this.config.blacklistProjects) {
      // take all projects in payload, and remove the ones specified by user
      // i.e., convert user's "whitelist" into a "blacklist"
      this.config.projects = [];
      tasks.projects.forEach((project) => {
        if (this.userList.includes(project.id)) {
          return; // blacklisted
        }
        this.config.projects.push(project.id);
      });
      if (self.config.debug) {
        console.log(
          "MMM-Todoist: original list of projects was blacklisted.\n" +
            "Only considering the following projects:"
        );
        console.log(this.config.projects);
      }
    }

    //include all tasks with due dates (if set in config) OR with due dates within config number of days
    if (
      self.config.displayTasksWithinDays > -1 ||
      !self.config.displayTasksWithoutDue
    ) {
      tasks.items = tasks.items.filter(function (item) {
        if (item.due === null) {
          return self.config.displayTasksWithoutDue;
        }

        var oneDay = 24 * 60 * 60 * 1000;
        var dueDateTime = self.parseDueDate(item.due.date);
        var dueDate = new Date(
          dueDateTime.getFullYear(),
          dueDateTime.getMonth(),
          dueDateTime.getDate()
        );
        var now = new Date();
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var diffDays = Math.floor((dueDate - today) / oneDay);
        return diffDays <= self.config.displayTasksWithinDays;
      });
    }

    //filter tasks to include in template data by the criteria specified in the Config
    tasks.items.forEach(function (item) {
      // do not include any subtasks
      if (item.parent_id != null && !self.config.displaySubtasks) {
        return;
      }

      // Filter to include all tasks with labels listed in config (if any labels are listed)
      if (self.config.labels.length > 0 && item.labels.length > 0) {
        // Check all the labels assigned to the task. Add to items if match with configured label
        for (let label of item.labels) {
          for (let labelName of self.config.labels) {
            if (label == labelName) {
              items.push(item);
              return;
            }
          }
        }
      }

      // Filter to include tasks with projects listed in config (if any projects are listed)
      if (self.config.projects.length > 0) {
        self.config.projects.forEach(function (project) {
          if (item.project_id == project) {
            items.push(item);
          }
        });
      }
    }); //end of filters

    // FOR DEBUGGING TO HELP PEOPLE GET THEIR PROJECT IDs //
    if (self.config.debug) {
      console.log(
        "%c *** PROJECT -- ID ***",
        "background: #222; color: #bada55"
      );
      tasks.projects.forEach((project) => {
        console.log(
          "%c" + project.name + " -- " + project.id,
          "background: #222; color: #bada55"
        );
      });
    }

    //convert item information to display formats
    items.forEach(function (item) {
      //Used for ordering by date
      if (item.due === null) {
        item.due = {};
        item.due["date"] = "2100-12-31"; //FAKE DUE DATE WHEN NONE SUPPLIED
        item.all_day = true;
      }
      // Used to sort by date.
      item.date = self.parseDueDate(item.due.date);

      // as v8 API does not have 'all_day' field anymore then check due.date for presence of time
      // if due.date has a time then set item.all_day to false else all_day is true
      if (item.due.date.length > 10) {
        item.all_day = false;
      } else {
        item.all_day = true;
      }

      //converting due date object to string
      if (item.due["date"] == "2100-12-31") {
        //check for fake due date
        item.duedate = "---";
      } else {
        item.duedate = self.addDueDate(item);
      }

      //inserting project info into task item for template
      if (self.config.displayOrder.includes("project")) {
        let proj = tasks.projects.find(({ pid }) => pid === item.project_id);
        if (proj === undefined) {
          item.project = {
            name: "---",
            color: "#808080"
          };
        } else {
          let projColor = self.config.colorMap.find(
            ({ name }) => name === proj.color
          );
          item.project = {
            name: proj.name,
            color: projColor.hex
          };
        }
      }

      //convert all due dates into days-until-due for countdown
      if (self.config.displayOrder.includes("countdown")) {
        if (item.due["date"] == "2100-12-31") {
          //check for fake due date
          item.countdown = "---";
        } else {
          let itemDueDate = moment(self.parseDueDate(item.due.date));
          item.countdown = itemDueDate.diff(moment(), "days") + 1; //adding to include the day something is due
        }
      }

      //insert assignee and avatar url
      if (
        self.config.displayOrder.includes("assignee") ||
        self.config.displayOrder.includes("avatar")
      ) {
        let collaborator = tasks.collaborators.find(
          ({ id }) => id === item.responsible_uid
        );
        if (collaborator === undefined) {
          item.assignee = "---";
          item.avatarURL =
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 15 15'%3E%3Ccircle cx='7.5' cy='7.5' r='7.1' style='fill: none; stroke: %23828282; stroke-width: .8px;'/%3E%3Ccircle cx='7.5' cy='5.63' r='3.08' style='fill: none; stroke: %23828282; stroke-width: .8px;'/%3E%3Cpath d='M2.33,12.36c1.02-2.86,4.16-4.35,7.01-3.34,1.56,.55,2.78,1.78,3.34,3.34' style='fill: none; stroke: %23828282; stroke-width: .8px;'/%3E%3C/svg%3E";
        } else {
          item.assignee = collaborator.full_name;
          if (collaborator.image_id) {
            /* Todoist provides a url for each user's avatar */
            item.avatarURL =
              "https://dcff1xvirvpfp.cloudfront.net/" +
              collaborator.image_id +
              "_small.jpg";
          } else {
            item.avatarURL =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 15 15'%3E%3Ccircle cx='7.5' cy='7.5' r='7.1' style='fill: none; stroke: %23828282; stroke-width: .8px;'/%3E%3Ccircle cx='7.5' cy='5.63' r='3.08' style='fill: none; stroke: %23828282; stroke-width: .8px;'/%3E%3Cpath d='M2.33,12.36c1.02-2.86,4.16-4.35,7.01-3.34,1.56,.55,2.78,1.78,3.34,3.34' style='fill: none; stroke: %23828282; stroke-width: .8px;'/%3E%3C/svg%3E";
          }
        }
      }
    });

    // Sorting code if you want to add new methods. //
    switch (self.config.sortType) {
      case "todoist":
        sorteditems = self.sortByTodoist(items);
        break;
      case "priority":
        sorteditems = self.sortByPriority(items);
        break;
      case "dueDateAsc":
        sorteditems = self.sortByDueDateAsc(items);
        break;
      case "dueDateDesc":
        sorteditems = self.sortByDueDateDesc(items);
        break;
      case "dueDateDescPriority":
        sorteditems = self.sortByDueDateDescPriority(items);
        break;
      default:
        sorteditems = self.sortByTodoist(items);
        break;
    }

    //Slice by max Entries
    items = items.slice(0, this.config.maximumEntries);

    //collate filtered and converted task information
    this.tasks = {
      items: items,
      projects: tasks.projects,
      collaborators: tasks.collaborators
    };
    return this.tasks;
  },
  /*
   * The Todoist API returns task due dates as strings in these two formats: YYYY-MM-DD and YYYY-MM-DDThh:mm:ss
   * This depends on whether a task only has a due day or a due day and time. You cannot pass this date string into
   * "new Date()" - it is inconsistent. In one format, the date string is considered to be in UTC, the other in the
   * local timezone. Additionally, if the task's due date has a timezone set, it is given in UTC (zulu format),
   * otherwise it is local time. The parseDueDate function keeps Dates consistent by interpreting them all relative
   * to the same timezone.
   */
  parseDueDate: function (date) {
    let [year, month, day, hour = 0, minute = 0, second = 0] = date
      .split(/\D/)
      .map(Number);

    // If the task's due date has a timezone set (as opposed to the default floating timezone), it's given in UTC time.
    if (date[date.length - 1] === "Z") {
      return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    }

    return new Date(year, month - 1, day, hour, minute, second);
  },
  sortByTodoist: function (itemstoSort) {
    itemstoSort.sort(function (a, b) {
      // 2019-12-31 bugfix by thyed, property is child_order, not item_order
      var itemA = a.child_order,
        itemB = b.child_order;
      return itemA - itemB;
    });
    return itemstoSort;
  },
  sortByDueDateAsc: function (itemstoSort) {
    itemstoSort.sort(function (a, b) {
      return a.date - b.date;
    });
    return itemstoSort;
  },
  sortByDueDateDesc: function (itemstoSort) {
    itemstoSort.sort(function (a, b) {
      return b.date - a.date;
    });
    return itemstoSort;
  },
  sortByPriority: function (itemstoSort) {
    itemstoSort.sort(function (a, b) {
      return b.priority - a.priority;
    });
    return itemstoSort;
  },
  sortByDueDateDescPriority: function (itemstoSort) {
    itemstoSort.sort(function (a, b) {
      if (a.date > b.date) return 1;
      if (a.date < b.date) return -1;

      if (a.priority < b.priority) return 1;
      if (a.priority > b.priority) return -1;
    });
    return itemstoSort;
  },

  addDueDate: function (item) {
    item.isDue = "later"; //var className = "bright align-right dueDate ";
    var innerHTML = "";

    var oneDay = 24 * 60 * 60 * 1000;
    var dueDateTime = this.parseDueDate(item.due.date);
    var dueDate = new Date(
      dueDateTime.getFullYear(),
      dueDateTime.getMonth(),
      dueDateTime.getDate()
    );
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var diffDays = Math.floor((dueDate - today) / oneDay);
    var diffMonths =
      dueDate.getFullYear() * 12 +
      dueDate.getMonth() -
      (now.getFullYear() * 12 + now.getMonth());

    if (diffDays < -1) {
      innerHTML =
        dueDate.toLocaleDateString(config.language, {
          month: "short"
        }) +
        " " +
        dueDate.getDate();
      item.isDue = "overdue"; //className += "xsmall overdue";
    } else if (diffDays === -1) {
      innerHTML = this.translate("YESTERDAY");
      item.isDue = "overdue"; //className += "xsmall overdue";
    } else if (diffDays === 0) {
      innerHTML = this.translate("TODAY");
      if (item.all_day || dueDateTime >= now) {
        item.isDue = "today"; //className += "today";
      } else {
        item.isDue = "overdue"; //className += "overdue";
      }
    } else if (diffDays === 1) {
      innerHTML = this.translate("TOMORROW");
      item.isDue = "tomorrow"; //className += "xsmall tomorrow";
    } else if (diffDays < 7) {
      innerHTML = dueDate.toLocaleDateString(config.language, {
        weekday: "short"
      });
      item.isDue = "soon"; //className += "xsmall";
    } else if (diffMonths < 7 || dueDate.getFullYear() == now.getFullYear()) {
      innerHTML =
        dueDate.toLocaleDateString(config.language, {
          month: "short"
        }) +
        " " +
        dueDate.getDate();
      //className += "xsmall";
    } else if (item.due.date === "2100-12-31") {
      innerHTML = "";
      //className += "xsmall";
    } else {
      innerHTML =
        dueDate.toLocaleDateString(config.language, {
          month: "short"
        }) +
        " " +
        dueDate.getDate() +
        " " +
        dueDate.getFullYear();
      //className += "xsmall";
    }
    if (innerHTML !== "" && !item.all_day) {
      function formatTime(d) {
        function z(n) {
          return (n < 10 ? "0" : "") + n;
        }
        var h = d.getHours();
        var m = z(d.getMinutes());
        if (config.timeFormat == 12) {
          return " " + (h % 12 || 12) + ":" + m + (h < 12 ? " AM" : " PM");
        } else {
          return " " + h + ":" + m;
        }
      }
      innerHTML += formatTime(dueDateTime);
    }
    return innerHTML; //this.createCell(className, innerHTML);
  }
});
