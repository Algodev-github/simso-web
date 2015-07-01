// Main controler of the conf service.
simsoControllers.controller('configurationCtrl', ['confService', 'logsService', 'pypyService', '$scope', function(confService, logsService, pypyService, $scope) {
	// conf is our model containing the configuration.
	$scope.conf = confService;
	$scope.pypyService = pypyService;
	$scope.pypyready = pypyService.pypyready;
	if (!$scope.pypyready) {
		$scope.pypyService.registerObserverCallback($scope, function() {
			$scope.$apply(function() {
				$scope.pypyready = true;
			});
		});
	}
	
	// Refreshes the python script (debug only)
	$scope.refresh_py = function() {
		for(var i = 0; i < pypyService.pythonFiles["files"].length; i++) {
			pypyService.vm.execfile(pypyService.pythonFiles["files"][i]);
		}
	};
	
	$scope.run = function() {
		var script = "configuration = Configuration();";
		var pyNumber = function(n, defaultValue) {
			defaultValue = typeof defaultValue == "undefined" ? 0 : defaultValue;
			return isNaN(n) ? defaultValue : n;
		};
		
		var escape = function(n) {
			return n == "-" ? "" : n;
		};
		
		var getType = function(task) {
			if(task.type == 0)
				return "\"Periodic\"";
			else if(task.type == 1)
				return "\"APeriodic\"";
			else if(task.type == 2)
				return "\"Sporadic\"";
		};
		
		var follower = function(task) {
			return task.followedBy == -1 ? "None" : task.followedBy;
		};
		
		var formatCustomData = function(obj, arr) {
			var data = [];
			for(var i = 0; i < arr.length; i++) {
				var attr = arr[i];
				
				// Skip undefined values
				if(typeof(obj[attr.name]) == "undefined")
					continue;
					
				data.push("\"" + attr.name + "\" : \"" + obj[attr.name] + "\"");
			}
			return "{" + data.join(',') + '}';
		};
		
		var formatTaskData = function(task) {
			return formatCustomData(task, $scope.conf.taskAdditionalFields);	
		};
		
		var formatProcData = function(proc) {
			return formatCustomData(proc, $scope.conf.procAdditionalFields);
		};
		
		var toPy = function(value, pytype) {
			if(pytype == "float" || pytype == "int")
				return value;
			else if(pytype == "bool")
				return value == "true" ? "True" : "False";
			else
				return '"' + value + '"';
		};
		// Global
		script += "configuration.duration = " + $scope.conf.duration + ";\n";
		script += "configuration.cycles_per_ms = " + $scope.conf.cycles_per_ms + ";\n";
		// Add tasks
		for (var i = 0; i < $scope.conf.tasks.length; i++) {
			var task = $scope.conf.tasks[i];
			script += "configuration.add_task(name=\"" + task.name
				+ "\", identifier=" + task.id
				+ ", abort_on_miss=" + (task.abortonmiss ? "True" : "False")
				+ ", activation_date=" + pyNumber(task.activationDate)
				+ ", list_activation_dates=[" + escape(task.activationDates) + "]"
				+ ", period=" + pyNumber(task.period)
				+ ", deadline=" + task.deadline
				+ ", task_type=" + getType(task)
				+ ", followed_by=" + follower(task)
				+ ", data=" + formatTaskData(task)
				+ ", wcet=" + task.wcet + ");\n";
		}
		// Add processors
		for (var i = 0; i < $scope.conf.processors.length; i++) {
			var proc = $scope.conf.processors[i];
			script += "configuration.proc_info_list.append(ProcInfo(";
			script += proc.id + ", ";
			script += '"' + proc.name + "\", ";
			script += "cs_overhead=" + pyNumber(proc.csOverhead) + ", ";
			script += "cl_overhead=" + pyNumber(proc.clOverhead) + ", ";
			script += "speed = " + pyNumber(proc.speed, 1.0) + ", ";
			script += "data = " + formatProcData(proc);
			script += "));\n";
			/*script += "configuration.add_processor(name=\"" + proc.name 
				+ "\", identifier=" + proc.id 
				+ ", cs_overhead=" + pyNumber(proc.csOverhead)
				+ ", cl_overhead=" + pyNumber(proc.clOverhead)
				+ ", speed=" + pyNumber(proc.speed, 1.0)
				+ ");\n";*/
		}
		
		/*
		        proc = ProcInfo(
            identifier, name, cs_overhead, cl_overhead, migration_overhead,
            speed)
        self.proc_info_list.append(proc)*/
		
		// Set scheduler
		script += "configuration.scheduler_info.clas = '" + $scope.conf.scheduler_class.name + "';";
		
		// Additional scheduler fields.
		script += "configuration.scheduler_info.data = {};\n";
		for(var i = 0; i < $scope.conf.schedAdditionalFields.length; i++) {
			var field = $scope.conf.schedAdditionalFields[i];
			script += "configuration.scheduler_info.data[\"" + field.name + "\"] = " + toPy(field.value, field.type) + ";\n";
		}
		
		
		script += "run()";
		console.log(script);
		pypyService.vm.loadModuleData($scope.conf.scheduler_class.name).then(function() {
			pypyService.vm.exec(script).then(function() {
				$scope.enableResults();
				$scope.conf.savedConf = $scope.conf.clone();
				$scope.conf.window.startDate = 0;
				$scope.conf.window.endDate = $scope.conf.duration_ms;
			});
		});
	}
}]);


simsoControllers.controller('ConfigGeneralCtrl', ['confService', '$scope', function(confService, $scope) {
	$scope.conf = confService;
}]);

