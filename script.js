"use strict";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

class Workout {
  date = new Date();
  id = Date.now().toString().slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,lon]
    this.distance = distance; // km
    this.duration = duration; // min
  }
  _setDescription() {
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
  }
}
const run1 = new Running([120, -19], 12, 90, 20);
const cycle1 = new Cycling([90, 102], 10, 120, 120);

/////////////////////////////////////////////////////////////////////////////////////////////////////
// APPLICATION

const form = document.querySelector(".form");
// const containerWorkout = document.querySelector()
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #markers = [];
  #mapZoomLevel = 13;
  constructor() {
    // get position
    this._getPosition();
    // evenet listners
    form.addEventListener("submit", this._newWorkout.bind(this));
    inputType.addEventListener("change", this._toggleElevationField);

    // done in below listener
    // containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));

    //get workouts
    this._getWorkouts();
    this._renderDeleteAllIcon();
    //container listeners + Edit or delete workout
    containerWorkouts.addEventListener(
      "click",
      function (e) {
        this._moveToPopup(e);
        const btnEdit = e.target.closest(".icon__edit--workout");
        const btnDelete = e.target.closest(".icon__delete--workout");
        const btnDeleteAll = e.target.closest(".delete-all-icon--container");
        if (btnDeleteAll) {
          this._deleteAllWorkout();
        }
        if (btnEdit) {
          const workoutID = btnEdit.closest(".workout").dataset.id;
          this._editWorkout(workoutID);
        }
        if (btnDelete) {
          const workoutID = btnDelete.closest(".workout").dataset.id;
          this._deleteWorkout(workoutID);
        }
      }.bind(this)
    );
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function (error) {
        console.log(error.message);
      }
    );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on("click", this._showForm.bind(this));
    this.#workouts.forEach((workout) => {
      this._renderWorkoutMarker(workout);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    // It focus the input field after time.. it gives time to load form and then focus
    setTimeout(() => {
      inputDistance.focus();
    }, 100);
  }

  _hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        "";
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => {
      form.style.display = "grid";
    }, 1000);
  }

  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }
  _checkValidInputs(...inputs) {
    return inputs.every((inp) => Number.isFinite(inp) && inp > 0);
  }

  _newWorkout(e) {
    e.preventDefault();

    //Helper functions
    // No need
    // const isValidInput = (...inputs) =>
    //   inputs.every((inp) => Number.isFinite(inp));
    // const isPositiveNum = (...inputs) => inputs.every((inp) => inp > 0);

    // Get the data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if workout running take cadence and check for valid number
    if (type === "running") {
      const cadence = +inputCadence.value;
      if (!this._checkValidInputs(distance, duration, cadence)) {
        return alert("Input must be postive number");
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if workout cycling take elevation and check for valid number
    if (type === "cycling") {
      const elevation = +inputElevation.value;
      if (!this._checkValidInputs(distance, duration, elevation)) {
        return alert("Input must be postive number");
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // add new object to workout array
    this.#workouts.push(workout);

    // render workout on map as marker
    this._renderWorkoutMarker(workout);

    // render workout on list
    this._renderWorkoutOnList(workout);

    // clear form
    this._hideForm();

    //store workout
    this._storeWorkouts();
    this._renderDeleteAllIcon();
  }
  // delete workout when click on X icon
  _deleteWorkout(workoutID) {
    const workoutCoords = this.#workouts.find(
      (workout) => workout.id === workoutID
    ).coords;
    const workoutIndex = this.#workouts.findIndex(
      (workout) => workout.id === workoutID
    );
    this.#workouts.splice(workoutIndex, 1);
    const li = document.querySelector(`[data-id="${workoutID}"]`);
    li.remove();
    const markerIndex = this.#markers.findIndex((marker) => {
      const { lat, lng } = marker._latlng;
      return lat === workoutCoords[0] && lng === workoutCoords[1];
    });
    const [marker] = this.#markers.splice(markerIndex, 1);
    marker.remove();
    this._storeWorkouts();
    this._renderDeleteAllIcon();
  }
  //Delete all workouts
  _deleteAllWorkout() {
    this.#workouts = [];
    const workouts = containerWorkouts.querySelectorAll(".workout");
    this.#markers.forEach((mark) => mark.remove());
    this.#markers = [];
    workouts.forEach((work) => work.remove());
    this._storeWorkouts();
    this._renderDeleteAllIcon();
  }
  // Edit workout
  _editWorkout(workoutID) {
    let html;
    const workout = this.#workouts.find((work) => work.id === workoutID);
    const li = document.querySelector(`[data-id="${workoutID}"]`);
    html = `<li class="workout workout-${
      workout.type
    } data workout-edit" data-id="${workout.id}">
              <div class="workout__icon-container">
            <box-icon
              class="icon__edit--workout"
              type="solid"
              name="edit"
              color="#fff"
            ></box-icon>
            <box-icon
              class="icon__delete--workout"
              name="message-square-x"
              color="#ffffff"
            ></box-icon>
          </div>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details--container">
            <div class="workout__details">
              <span class="workout__icon">${
                workout.type === "running" ? "🏃‍♂️" : "🚴‍♂️"
              }</span>
              <input type="number" class="workout-edit-input workout-edit-input__distance" />
              <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⏱</span>
              <input type="number" class="workout-edit-input workout-edit-input__duration" />
              <span class="workout__unit">min</span>
            </div>`;
    if (workout.type === "running") {
      html += `            
            <div class="workout__details">
              <span class="workout__icon">🦶</span>
              <input type="number" class="workout-edit-input workout-edit-input__cadence" />
              <span class="workout__unit">spm</span>
            </div>
          </div>
        </li>`;
    }
    if (workout.type === "cycling") {
      html += `           
            <div class="workout__details">
              <span class="workout__icon">⛰ </span>
              <input type="number" class="workout-edit-input workout-edit-input__elevationGain" />
              <span class="workout__unit">m</span>
            </div>
          </div>
        </li>`;
    }
    // Insert the new HTML after the old <li>
    li.insertAdjacentHTML("afterend", html);
    // selecting edit html elements and setting it to the previous values
    const arrField = [
      "distance",
      "duration",
      workout.type === "running" ? "cadence" : "elevationGain",
    ];
    arrField.forEach((field) => {
      const inputField = document.querySelector(
        `.workout-edit-input__${field}`
      );
      inputField.value = workout[field];
    });
    // Remove the old <li>
    li.parentNode.removeChild(li);
    document.querySelector(".workout-edit-input__distance").focus();
    const workoutEdit = document.querySelector(".workout-edit");
    workoutEdit.addEventListener(
      "keydown",
      function (e) {
        if (e.key !== "Enter") return;

        workout.distance = +document.querySelector(
          ".workout-edit-input__distance"
        ).value;
        workout.duration = +document.querySelector(
          ".workout-edit-input__duration"
        ).value;
        if (workout.type === "running") {
          workout.cadence = +document.querySelector(
            ".workout-edit-input__cadence"
          ).value;
          if (
            !this._checkValidInputs(
              workout.distance,
              workout.duration,
              workout.cadence
            )
          ) {
            return alert("Input must be postive number");
          }
          workout.calcPace();
          // workout.pace = workout.duration / workout.distance;
        }
        if (workout.type === "cycling") {
          workout.elevationGain = +document.querySelector(
            ".workout-edit-input__elevationGain"
          ).value;
          if (
            !this._checkValidInputs(
              workout.distance,
              workout.duration,
              workout.elevationGain
            )
          ) {
            return alert("Input must be postive number");
          }
          workout.calcSpeed();
          // workout.speed = workout.distance / (workout.duration / 60);
        }
        // remove the editable code from html
        document.querySelector(".workout-edit").remove();

        // render new workout
        this._renderWorkoutOnList(workout);
        this._storeWorkouts();
      }.bind(this)
    );
  }

  // Not perfect one commenting it

  // _editWorkout(dataID) {
  //   const editWorkout = this.#workouts.find((workout) => workout.id === dataID);
  //   this._showForm();
  //   // form.removeEventListener("submit", this.boundNewWorkout);

  //   inputType.value = editWorkout.type;
  //   inputDistance.value = editWorkout.distance;
  //   inputDuration.value = editWorkout.duration;

  //   form.addEventListener(
  //     "submit",
  //     function (e) {
  //       e.preventDefault();
  //       const editValues = {
  //         type: inputType.value,
  //         distance: inputDistance.value,
  //         duration: inputDuration.value,
  //         cadence: inputCadence.value,
  //       };
  //       if (inputElevation.value) {
  //         editValues.elevationGain = inputElevation.value;
  //       }
  //       Object.assign(editWorkout, editValues);
  //       this._hideForm();
  //       this.updateExistingWorkout(editWorkout);
  //     }.bind(this)
  //   );
  // }
  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: true,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♂️"} ${workout.description}`
      )
      .openPopup();
    this.#markers.push(marker);
  }
  _renderWorkoutOnList(workout) {
    let html;
    html = `<li class="workout workout-${workout.type} data" data-id="${
      workout.id
    }">
              <div class="workout__icon-container">
            <box-icon
              class="icon__edit--workout"
              type="solid"
              name="edit"
              color="#fff"
            ></box-icon>
            <box-icon
              class="icon__delete--workout"
              name="message-square-x"
              color="#ffffff"
            ></box-icon>
          </div>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details--container">
            <div class="workout__details">
              <span class="workout__icon">${
                workout.type === "running" ? "🏃‍♂️" : "🚴‍♂️"
              }</span>
              <span class="workout__value">${workout.distance}</span>
              <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⏱</span>
              <span class="workout__value">${workout.duration}</span>
              <span class="workout__unit">min</span>
            </div>`;
    if (workout.type === "running") {
      html += `            <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.pace.toFixed(1)}</span>
              <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">🦶</span>
              <span class="workout__value">${workout.cadence}</span>
              <span class="workout__unit">spm</span>
            </div>
          </div>
        </li>`;
    }
    if (workout.type === "cycling") {
      html += `            <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.speed.toFixed(1)}</span>
              <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⛰ </span>
              <span class="workout__value">${workout.elevationGain}</span>
              <span class="workout__unit">m</span>
            </div>
          </div>
        </li>`;
    }
    form.insertAdjacentHTML("afterend", html);
  }

  // Not perfect one commenting it too

  // updateExistingWorkout(workout) {
  //   const editItem = containerWorkouts.querySelector(
  //     `[data-id="${workout.id}"]`
  //   );
  //   console.log(editItem);
  //   editItem.innerHTML = `
  //             <div class="workout__icon-container">
  //           <box-icon class="icon__edit--workout" type="solid" name="edit" color="#fff"></box-icon>
  //           <box-icon class="icon__delete--workout" name="message-square-x" color="#ffffff"></box-icon>
  //         </div>
  //         <h2 class="workout__title">Running on September 3</h2>
  //         <div class="workout__details--container">
  //           <div class="workout__details">
  //             <span class="workout__icon">🏃&zwj;♂️</span>
  //             <span class="workout__value">${workout.distance}</span>
  //             <span class="workout__unit">km</span>
  //           </div>
  //           <div class="workout__details">
  //             <span class="workout__icon">⏱</span>
  //             <span class="workout__value">${workout.duration}</span>
  //             <span class="workout__unit">min</span>
  //           </div>            <div class="workout__details">
  //             <span class="workout__icon">⚡️</span>
  //             <span class="workout__value">${workout.cadence}</span>
  //             <span class="workout__unit">min/km</span>
  //           </div>
  //           <div class="workout__details">
  //             <span class="workout__icon">🦶</span>
  //             <span class="workout__value">10</span>
  //             <span class="workout__unit">spm</span>
  //           </div>
  //         </div>
  //   `;
  // }
  _moveToPopup(e) {
    const workout = e.target.closest(".workout");
    if (!workout) return;
    const workoutID = workout.dataset.id;
    const workToShow = this.#workouts.find((work) => {
      return work.id === workoutID;
    });
    this.#map.setView(workToShow.coords, this.#mapZoomLevel, {
      animation: true,
      pan: {
        duration: 1,
      },
    });
  }
  _storeWorkouts() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }
  // sort workout array by distance
  _sortWorkouts() {
    this.#workouts.sort((a, b) => a.distance - b.distance);
  }
  // get workout and also render delete all icon
  _getWorkouts() {
    const data = JSON.parse(localStorage.getItem("workouts"));

    if (!data) return;
    data.forEach((work) => {
      if (work.type === "running") {
        const workout = new Running(
          work.coords,
          work.distance,
          work.duration,
          work.cadence
        );
        this.#workouts.push(workout);
      } else {
        const workout = new Cycling(
          work.coords,
          work.distance,
          work.duration,
          work.elevationGain
        );
        this.#workouts.push(workout);
      }
    });
    console.log(data);
    console.log(this.#workouts);
    this._sortWorkouts();
    this.#workouts.forEach((work) => {
      this._renderWorkoutOnList(work);
    });
  }
  _renderDeleteAllIcon() {
    const deleteAllBtn = document.querySelector(".delete-all-icon--container");
    deleteAllBtn.classList.toggle("hidden", this.#workouts.length === 0);
  }
  reset() {
    //clear whole local storage
    localStorage.clear();

    // clear the only workouts
    // localStorage.removeItem("workouts");

    // reload page
    location.reload();
  }
}

const app = new App();
