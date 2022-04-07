var tableNumber = null;

AFRAME.registerComponent("markerhandler", {
  init: async function () {
    if (tableNumber === null) {
      this.askTableNumber();
    }

    //Get the dishes collection
    var dishes = await this.getDishes();

    //makerFound Event
    this.el.addEventListener("markerFound", () => {
      if (tableNumber !== null) {
        var markerId = this.el.id;
        this.handleMarkerFound(dishes, markerId);
      }
    });
    //markerLost Event
    this.el.addEventListener("markerLost", () => {
      this.handleMarkerLost();
    });
  },
  askTableNumber: function () {
    var iconUrl =
      "https://raw.githubusercontent.com/whitehatjr/menu-card-app/main/hunger.png";
    swal({
      title: "Welcome to Hunger!!",
      icon: iconUrl,
      content: {
        element: "input",
        attributes: {
          placeholder: "Type your table number",
          type: "number",
          min: 1,
        },
      },
      closeOnClickOutside: false,
    }).then((inputValue) => {
      tableNumber = inputValue;
    });
  },

  handleMarkerFound: function (dishes, markerId) {
    // Getting today's day
    var todaysDate = new Date();
    var todaysDay = todaysDate.getDay();
    // Sunday - Saturday : 0 - 6
    var days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    // Changing Model scale to initial scale
    var dish = dishes.filter((dish) => dish.id === markerId)[0];

    //Check if the dish is available
    if (dish.unavailable_days.includes(days[todaysDay])) {
      swal({
        icon: "warning",
        title: dish.dish_name.toUpperCase(),
        text: "This dish is not available today!!!",
        timer: 2500,
        buttons: false,
      });
    } else {
      //Changing Model scale to initial scale
      var model = document.querySelector(`#model-${dish.id}`);
      model.setAttribute("position", dish.model_geometry.position);
      model.setAttribute("rotation", dish.model_geometry.rotation);
      model.setAttribute("scale", dish.model_geometry.scale);

      //Update UI conent VISIBILITY of AR scene(MODEL , INGREDIENTS & PRICE)

      model.setAttribute("visible", true);

      var ingredientsContainer = document.querySelector(
        `#main-plane-${dish.id}`
      );
      ingredientsContainer.setAttribute("visible", true);

      var priceplane = document.querySelector(`#price-plane-${dish.id}`);
      priceplane.setAttribute("visible", true);

      // Changing button div visibility
      var buttonDiv = document.getElementById("button-div");
      buttonDiv.style.display = "flex";

      var ratingButton = document.getElementById("rating-button");
      var orderButtton = document.getElementById("order-button");
      var orderSummaryButtton = document.getElementById("order-summary-button");
      var paynowbutton = document.getElementById("pay-button");

      // Handling Click Events
      ratingButton.addEventListener("click", () => {
        this.handleRating(dish);
      });

      orderButtton.addEventListener("click", () => {
        var tNumber;
        tableNumber <= 9 ? (tNumber = `T0${tableNumber}`) : `T${tableNumber}`;
        this.handleOrder(tNumber, dish);

        swal({
          icon: "https://i.imgur.com/4NZ6uLY.jpg",
          title: "Thanks For Order !",
          text: "Your order will serve soon on your table!",
          timer: 2000,
          buttons: false,
        });
      });

      orderSummaryButtton.addEventListener("click", () =>
        this.handleOrderSummary()
      );
      paynowbutton.addEventListener("click", () => {
        this.handlePayment();
      });
    }
  },

  handleOrder: function (tNumber, dish) {
    //Reading current table order details
    firebase
      .firestore()
      .collection("tables")
      .doc(tNumber)
      .get()
      .then((doc) => {
        var details = doc.data();

        if (details["current_orders"][dish.id]) {
          //Increasing Current Quantity
          details["current_orders"][dish.id]["quantity"] += 1;

          //Calculating Subtotal of item
          var currentQuantity = details["current_orders"][dish.id]["quantity"];

          details["current_orders"][dish.id]["subtotal"] =
            currentQuantity * dish.price;
        } else {
          details["current_orders"][dish.id] = {
            item: dish.dish_name,
            price: dish.price,
            quantity: 1,
            subtotal: dish.price * 1,
          };
        }

        details.total_bill += dish.price;

        // Updating db
        firebase.firestore().collection("tables").doc(doc.id).update(details);
      });
  },
  getDishes: async function () {
    return await firebase
      .firestore()
      .collection("dishes")
      .get()
      .then((snap) => {
        return snap.docs.map((doc) => doc.data());
      });
  },
  getOrderSummary: async function (tNumber) {
    return await firebase
      .firestore()
      .collection("tables")
      .doc(tNumber)
      .get()
      .then((doc) => doc.data());
  },
  handleOrderSummary: async function () {
    // getting table no.
    var tNumber;
    tableNumber <= 9 ? (tNumber = `T0${tableNumber}`) : `T${tableNumber}`;
    // getting order summary from database
    var orderSummary = await this.getOrderSummary(tNumber);
    // changing the model visibility
    // display:none (hiding)display:flex(to display the element)
    var model_div = document.getElementById("modal-div");
    model_div.style.display = "flex";
    // getTableEleme.ntId
    var table_bodytag = document.getElementById("bill-table-body");
    //  remove the older table headers name in tr(table in row) tag
    table_bodytag.innerHTML = "";
    // get current order keyvalues key =  id ,total_bill,current_orders
    var current_orders = Object.keys(orderSummary.current_orders);
    current_orders.map((i) => {
      // create a table row
      var tr = document.createElement("tr");
      // crate a table column
      var item = document.createElement("td");
      var price = document.createElement("td");
      var quantity = document.createElement("td");
      var subtotal = document.createElement("td");
      // add html elements to all
      item.innerHTML = orderSummary.current_orders[i].item;
      price.innerHTML = orderSummary.current_orders[i].price;
      quantity.innerHTML = orderSummary.current_orders[i].quantity;
      subtotal.innerHTML = orderSummary.current_orders[i].subtotal;

      price.setAttribute("class", "text-center");
      quantity.setAttribute("class", "text-center");
      subtotal.setAttribute("class", "text-right");
      // appending all tds to trs

      tr.appendChild(item);
      tr.appendChild(price);
      tr.appendChild(quantity);
      tr.appendChild(subtotal);

      table_bodytag.append(tr);
    });
    // creating total bil
    var totaltr = document.createElement("tr");
    var td1 = document.createElement("td");
    var td2 = document.createElement("td");
    var td3 = document.createElement("td");

    td1.setAttribute("class", "no-line");
    td2.setAttribute("class", "no-line");
    td1.setAttribute("class", "no-line text-center");

    var strongtag = document.createElement("strong");
    strongtag.innerHTML = "total";
    td3.appendChild(strongtag);

    var td4 = document.createElement("td");
    td1.setAttribute("class", "no-line text-right");
    td4.innerHTML = "$" + orderSummary.total_bill;
    totaltr.appendChild(td1);
    totaltr.appendChild(td2);
    totaltr.appendChild(td3);
    totaltr.appendChild(td4);

    table_bodytag.appendChild(totaltr);
  },
  handlePayment: function () {
    document.getElementById("modal-div").style.display = "none";
    var tNumber;
    tableNumber <= 9 ? (tNumber = `T0${tableNumber}`) : `T${tableNumber}`;
    //  resetting the current order in firebase
    firebase
      .firestore()
      .collection("tables")
      .doc(tNumber)
      .update({
        current_orders: {},
        total_bill: 0,
      })
      .then(() => {
        swal({
          icon: "success",
          title: "Thanks for paying",
          text: "we hope u enjoyed the food",
          timer: 2000,
          button: false,
        });
      });
  },
  handleMarkerLost: function () {
    // Changing button div visibility
    var buttonDiv = document.getElementById("button-div");
    buttonDiv.style.display = "none";
  },
  handleRating: async function (dish) {
    var tNumber;
    tableNumber <= 9 ? (tNumber = `T0${tableNumber}`) : `T${tableNumber}`;
    var orderSummary = await this.getOrderSummary(tNumber)
    var currentOrders = Object.keys(orderSummary.current_orders);
    if (currentOrders.length > 0 && currentOrders === dish.id) {
      // getting all rating model from index.html
      document.getElementById("rating-modal-div").style.display = "flex";
      document.getElementById("rating-input").value = "0";
      document.getElementById("feedback-input").value = "";
      var savingbutton = document.getElementById("save-rating-button");
      savingbutton.addEventListener("click", () => {
        document.getElementById("rating-modal-div").style.display = "none";
        var rating = document.getElementById("rating-input").value;
        var feedback = document.getElementById("feedback-input").value;
        // updating firebase after click submit button
        firebase
          .firestore()
          .collection("dishes")
          .doc(dish.id)
          .update({
            last_rating: rating,
            last_review: feedback,
          })
          .then(() => {
            swal({
              icon: "success",
              title: "Thanks For Rating",
              text: "We hope you like the dish!!",
              timer: 3000,
              button: false,
            });
          });
      });
    } else {
      swal({
        icon: "warning",
        title: "Oops!!",
        text: "No Dishes found to give rating",
        timer: 3000,
        button: false,
      });
    }
  },
});
