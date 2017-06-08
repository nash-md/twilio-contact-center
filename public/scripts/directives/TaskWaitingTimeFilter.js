function TaskWaitingTime() {
  
  return function(value) {

    let minutes = Math.floor(value / 60);
   	let seconds = value - (minutes * 60);

    if (minutes < 10){
      minutes = '0' + minutes;
    }

    if (seconds < 10){
      seconds = '0' + seconds;
    }

    return minutes + ':' + seconds;
  };

}

angular
  .module('callcenterApplication')
  .filter('TaskWaitingTime', TaskWaitingTime)