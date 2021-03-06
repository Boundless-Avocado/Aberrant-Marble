angular.module('boundless.services', [])

.factory('Message', function($http) {
	var sendMessage = function(data) {
		console.log('factory send message called');
		return $http({
			method: 'POST',
			url: '/api/groups/' + data.groupName + '/pings/',
			data: data
		})
		.then(function(resp) {
			return resp.data;
		});
	};

	return {
		sendMessage: sendMessage,
	};
})

.service('GroupNamePersist', function() {
	var groupName = '';
	
	var setGroupName = function(newGroup) {
		console.log('setting group name!', newGroup);
		groupName = newGroup;
	};

	var getGroupName = function() {
		console.log('getting group name!');
		return groupName;
	};

	return {
		setGroupName: setGroupName,
		getGroupName: getGroupName
	};
})

.factory('Groups', function($http, $state) {

	var getGroups = function() {
		return $http({
			method: 'GET',
			url: '/api/groups/'
		})
		.then(function (resp) {
			return resp.data;
		});
	};

	var createGroup = function(data) {
		console.log(data.phone + ' created the group: ' + data.name);
		return $http({
			method: 'POST',
			url: '/api/groups/',
			data: data
		})
		.then(function(resp) {
			if (resp) {
				$state.go('app.mygroups');
			}
			return resp.data;
		});
	};
		//new entry should added to the memberships join table. 
		// 'data' is an object containing the groups information
	var addGroup = function(data) {
		console.log(data.phone +' joined the group: ' + data.name);
		return $http({
			method: 'POST',
			url: '/api/groups/' + data.name + '/',
			data: data
		})
		.then(function(resp) {
			console.log(resp.data);
			return resp.data;
		});
	};

	var getUsers = function(data) {
		return $http({
				method: 'GET',
				url: '/api/groups/' + data + '/',
		})
		.then(function(resp) {
			return resp.data;
		});
	};

	var userGroups = function(phone) {
		return $http({
			method: 'GET',
			url: '/api/users/' + phone + '/groups',
		})
		.then(function(resp) {
			console.log('userGroup called');
			return resp.data;
		});
	};

	var leaveGroup = function(data) {
		return $http({
				method: 'delete',
				url: '/api/users/' + data.phone + '/groups/' + data.groupName,
				data: data
		})
		.then(function(resp) {
			return resp;
		});
	};

	var nearby = function(lat, lng) {
		return $http({
			method: 'GET',
			url: '/api/groups/nearby',
			params: {
				latitude: lat,
				longitude: lng
			}
		})
		.then(function (resp) {
			return resp.data;
		});
	};

	return {
		getGroups: getGroups,
		createGroup: createGroup,
		addGroup: addGroup,
		getUsers: getUsers,
		userGroups: userGroups,
		leaveGroup: leaveGroup,
		nearby: nearby
	};
})

.factory('Auth', function($http, $location, $window, $state){ 
		//Authorization is currently storing username in local storage
	var signin = function(user) {
		console.log(user);
		return $http({
				method: 'POST',
				url: '/api/users/signin',
				data: user
		})
		.then(function(resp) {
			if (resp) {
				$window.localStorage.setItem('token', resp.data.token);
				$state.go('app.mygroups');
			}
		});
	};

		//this should query server for a confirmation code
	var signup = function(user) {
		return $http({
			method: 'POST',
			url: '/api/users/signup',
			data: user
		})
		.then(function(resp) {
			if (resp) {
				$state.go('app.allgroups');
				$window.localStorage.setItem('token', resp.data.token);
			}
		});
	};

	var signout = function() {
		$window.localStorage.removeItem('phone');
		$location.path('/');
	};
		//checks token to check if user's session is still valid
	var isAuth = function() {
		return !!$window.localStorage.getItem('phone');
	};

	return {
		signin: signin,
		signup: signup,
		isAuth: isAuth,
		signout: signout,
	};
})

.factory('AttachTokens', function($window){ 
	
		//Authorization is currently storing username in local storage
	var attach = {

		request: function(object) {
			var jwt = $window.localStorage.getItem('token');
			if (jwt) {
				object.headers['x-access-token'] = jwt;
			}
			object.headers['Allow-Control-Allow-Origin'] = '*';
			return object;
		}
	};

	return attach;
});