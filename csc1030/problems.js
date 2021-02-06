// This file should be autogenerated

import {loadLevelTasks as loadLevelTasks0} from "./0.js";
import {loadLevelTasks as loadLevelTasks1} from "./1.js";
import {loadLevelTasks as loadLevelTasks2} from "./2.js";
import {loadLevelTasks as loadLevelTasks3} from "./3.js";
import {loadLevelTasks as loadLevelTasks4} from "./4.js";
import {loadLevelTasks as loadLevelTasks5} from "./5.js";
import {loadLevelTasks as loadLevelTasks6} from "./6.js";
import {loadLevelTasks as loadLevelTasks7} from "./7.js";

const loadLevelTasksArr = [loadLevelTasks0, loadLevelTasks1, loadLevelTasks2, 
                           loadLevelTasks3, loadLevelTasks4, loadLevelTasks5,
                           loadLevelTasks6, loadLevelTasks7];

window.addEventListener('DOMContentLoaded', () => {
	const levelIndex = window.location && typeof window.location.href === "string"
	  && parseInt(window.location.href.substring(window.location.href.indexOf("level=")+6)) 
	  || 0;
	console.log("Loading level", levelIndex);
	if(0 <= levelIndex && levelIndex < loadLevelTasksArr.length) {
	  const citf = loadLevelTasksArr[levelIndex]();
	  citf.runTasks();
	}
});