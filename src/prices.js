/*
 * Crown Events & Conferences Perth — 2026 menu price catalogue.
 *
 * Source: the "E&C Menu 2026" PDF price books held in Google Drive.
 * Food/most beverage menus are valid 01 Jul 2026 – 30 Jun 2027.
 * The Christmas Buffet is valid 01 Jul 2026 – 31 Dec 2026.
 *
 * To re-sync after a price change: update the prices here (or re-run the
 * extraction) and bump CATALOGUE_META.updated. This file is the single
 * source of truth the checker compares BEO/SOC charges against.
 *
 * unit values:
 *   pp              = per person
 *   pp_per_course   = per person, per course
 *   pp_per_selection= per person, per selection
 *   child           = per child
 *   glass / bottle  = per glass / per bottle (served on consumption)
 *   each            = per item (e.g. cocktails)
 *   flat            = flat fee (e.g. barista cart hire)
 */
(function (root) {
  "use strict";

  var CATALOGUE_META = {
    venue: "Crown Events & Conferences Perth",
    year: "2026",
    validFrom: "2026-07-01",
    validTo: "2027-06-30",
    updated: "2026-10-13",
    source: "Google Drive — E&C Menu 2026 folder"
  };

  // category, name (as it typically appears on a BEO/SOC), price, unit, extras
  var ITEMS = [
    // ---------- DINNER — BUFFET ----------
    { category: "Dinner Buffet", name: "Dinner Buffet Menu One", price: 90, unit: "pp", minGuests: 50, composition: { set: "dinnerBuffet", limits: { cold: 3, hot: 3, pasta: 1, side: 1, dessert: 2 } }, note: "3 cold, 3 hot, 1 pasta, 1 side, 2 desserts; incl. rolls, coffee & tea (max 2 hrs).", aliases: ["Dinner Buffet Menu 1"] },
    { category: "Dinner Buffet", name: "Dinner Buffet Menu Two", price: 104, unit: "pp", minGuests: 50, composition: { set: "dinnerBuffet", limits: { cold: 4, hot: 4, pasta: 1, side: 1, dessert: 3 } }, note: "4 cold, 4 hot, 1 pasta, 1 side, 3 desserts.", aliases: ["Dinner Buffet Menu 2"] },
    { category: "Dinner Buffet", name: "Dinner Buffet Menu Three", price: 120, unit: "pp", minGuests: 50, composition: { set: "dinnerBuffet", limits: { cold: 5, hot: 4, pasta: 1, side: 2, dessert: 3 } }, note: "5 cold, 4 hot, 1 pasta, 2 sides, 3 desserts (incl. cheese or fruit platter).", aliases: ["Dinner Buffet Menu 3"] },
    { category: "Dinner Buffet", name: "Dinner Buffet Additional Course", price: 16, unit: "pp", note: "Additional course" },

    // ---------- DINNER — PLATED ----------
    { category: "Dinner Plated", name: "Plated Dinner Menu One", price: 96, unit: "pp", minGuests: 50, composable: true, altPrice: 10, addCoursePrice: 22, aliases: ["Dinner Plated Menu One", "Dinner Set Menu One", "Set Dinner Menu One"] },
    { category: "Dinner Plated", name: "Plated Dinner Menu Two", price: 105, unit: "pp", minGuests: 50, composable: true, altPrice: 10, addCoursePrice: 22, aliases: ["Dinner Plated Menu Two", "Dinner Set Menu Two", "Set Dinner Menu Two"] },
    { category: "Dinner Plated", name: "Plated Dinner Menu Three", price: 120, unit: "pp", minGuests: 50, composable: true, altPrice: 10, addCoursePrice: 22, aliases: ["Dinner Plated Menu Three", "Dinner Set Menu Three", "Set Dinner Menu Three"] },
    { category: "Dinner Plated", name: "Plated Dinner Additional Course", price: 22, unit: "pp" },
    { category: "Dinner Plated", name: "Plated Dinner Alternating Service", price: 10, unit: "pp_per_course" },
    { category: "Dinner Plated", name: "Plated Dinner Salad Enhancement", price: 14, unit: "pp" },
    { category: "Dinner Plated", name: "Plated Dinner Pasta Enhancement", price: 24, unit: "pp" },
    { category: "Dinner Plated", name: "Plated Dinner Charcuterie and Cheese Platter", price: 30, unit: "pp" },
    { category: "Dinner Plated", name: "Plated Dinner Charcuterie and Cheese Individual", price: 34, unit: "pp" },
    { category: "Dinner Plated", name: "Plated Dinner Sides", price: 14, unit: "pp" },

    // ---------- DINNER — INDIAN ----------
    { category: "Dinner Indian", name: "Indian Buffet Package One", price: 129, unit: "pp", minGuests: 50, composition: { set: "indianBuffet", limits: { "entrée": 2, salad: 3, "meat/fish": 2, veg: 2, paneer: 1, dahl: 1, rice: 1, dessert: 3, bread: 2 } }, note: "2 entrées, 3 salads, 2 meat/fish, 2 veg, 1 paneer, 1 dahl, 1 rice, 3 desserts, 2 breads." },
    { category: "Dinner Indian", name: "Indian Buffet Package Two", price: 150, unit: "pp", minGuests: 50, composition: { set: "indianBuffet", limits: { "entrée": 3, salad: 4, "meat/fish": 3, veg: 3, paneer: 1, dahl: 1, rice: 1, dessert: 3, bread: 2 } }, note: "3 entrées, 4 salads, 3 meat/fish, 3 veg, 1 paneer, 1 dahl, 1 rice, 3 desserts, 2 breads." },
    { category: "Dinner Indian", name: "Indian Buffet Vegetarian Option", price: 126, unit: "pp", minGuests: 50, composition: { set: "indianBuffet", limits: { "entrée": 2, salad: 3, veg: 4, paneer: 1, dahl: 1, rice: 1, dessert: 3, bread: 2 } }, note: "2 entrées, 3 salads, 4 veg, 1 paneer, 1 dahl, 1 rice, 3 desserts, 2 breads." },

    // ---------- CHINESE BANQUET ----------
    { category: "Chinese Banquet", name: "Chinese Banquet Menu One", price: 160, unit: "pp", minGuests: 50, note: "Entrée, soup, 4 main courses, dessert; incl. Tie Guan Yin tea (10 per table)." },
    { category: "Chinese Banquet", name: "Chinese Banquet Menu Two", price: 175, unit: "pp", minGuests: 50, note: "Entrée, soup, 4 premium main courses, dessert; incl. Tie Guan Yin tea (10 per table)." },
    { category: "Chinese Banquet", name: "Children's Chinese Banquet Menu", price: 40, unit: "pp" },

    // ---------- CHILDREN ----------
    { category: "Children", name: "Children's Main Course", price: 30, unit: "child", mustInclude: ["child", "children", "childrens", "kid", "kids"], composition: { set: "children", limits: { main: 1, dessert: 1 } }, note: "Select one main and one dessert per child (dessert included). $30 per child.", aliases: ["Childrens Menu Main Course", "Kids Main", "Children's Menu", "Childrens Menu"] },
    { category: "Children", name: "Children's Beverages", price: 12.5, unit: "child", mustInclude: ["child", "children", "childrens", "kid", "kids"] },

    // ---------- CHRISTMAS BUFFET (valid to 31 Dec 2026) ----------
    { category: "Christmas Buffet", name: "Christmas Buffet Menu One", price: 90, unit: "pp", minGuests: 50, validFrom: "2026-07-01", validTo: "2026-12-31", composition: { set: "dinnerBuffet", limits: { cold: 3, hot: 3, pasta: 1, side: 1, dessert: 2 } }, note: "3 cold, 3 hot, 1 pasta, 1 side, 2 desserts; incl. rolls, coffee & tea (max 2 hrs). Christmas menu — valid to 31 Dec 2026.", aliases: ["Buffet Christmas Menu One", "Christmas Menu One"] },
    { category: "Christmas Buffet", name: "Christmas Buffet Menu Two", price: 104, unit: "pp", minGuests: 50, validFrom: "2026-07-01", validTo: "2026-12-31", composition: { set: "dinnerBuffet", limits: { cold: 4, hot: 4, pasta: 1, side: 1, dessert: 3 } }, note: "4 cold, 4 hot, 1 pasta, 1 side, 3 desserts. Christmas menu — valid to 31 Dec 2026.", aliases: ["Buffet Christmas Menu Two", "Christmas Menu Two"] },
    { category: "Christmas Buffet", name: "Christmas Buffet Menu Three", price: 120, unit: "pp", minGuests: 50, validFrom: "2026-07-01", validTo: "2026-12-31", composition: { set: "dinnerBuffet", limits: { cold: 5, hot: 4, pasta: 1, side: 2, dessert: 3 } }, note: "5 cold, 4 hot, 1 pasta, 2 sides, 3 desserts (incl. cheese or fruit platter). Christmas menu — valid to 31 Dec 2026.", aliases: ["Buffet Christmas Menu Three", "Christmas Menu Three"] },
    { category: "Christmas Buffet", name: "Christmas Buffet Additional Course", price: 16, unit: "pp", validFrom: "2026-07-01", validTo: "2026-12-31" },

    // ---------- LUNCH — BUFFET ----------
    { category: "Lunch Buffet", name: "Lunch Buffet Menu One", price: 62, unit: "pp", minGuests: 30, note: "Daily set menu (cold savoury, salad, hot dishes, dessert); incl. rolls, coffee & tea (max 1 hr)." },
    { category: "Lunch Buffet", name: "Lunch Buffet Menu Two", price: 69, unit: "pp", minGuests: 30, note: "Menu One plus a sandwich and extra dessert/fruit platter." },
    { category: "Lunch Buffet", name: "Lunch Buffet Menu Three", price: 88, unit: "pp", minGuests: 30, composition: { set: "lunchBuffet", limits: { sandwich: 1, "cold savoury": 1, salad: 1, hot: 3, dessert: 3 } }, note: "Custom build: 1 sandwich, 1 cold savoury, 1 salad, 3 hot dishes, 3 desserts." },
    { category: "Lunch Buffet", name: "Lunch Buffet Seated Surcharge", price: 12, unit: "pp", note: "Menu served seated" },
    { category: "Lunch Buffet", name: "Lunch Buffet Item Swap Surcharge", price: 16, unit: "pp", note: "Swapping any items" },

    // ---------- LUNCH — PLATED ----------
    { category: "Lunch Plated", name: "Plated Lunch Menu One Two Course", price: 81, unit: "pp", minGuests: 30, composable: true, altPrice: 10, addCoursePrice: 18 },
    { category: "Lunch Plated", name: "Plated Lunch Menu One Three Course", price: 99, unit: "pp", minGuests: 30, composable: true, altPrice: 10, addCoursePrice: 18 },
    { category: "Lunch Plated", name: "Plated Lunch Menu Two Two Course", price: 91, unit: "pp", minGuests: 30, composable: true, altPrice: 10, addCoursePrice: 18 },
    { category: "Lunch Plated", name: "Plated Lunch Menu Two Three Course", price: 109, unit: "pp", minGuests: 30, composable: true, altPrice: 10, addCoursePrice: 18 },
    { category: "Lunch Plated", name: "Plated Lunch Additional Course", price: 18, unit: "pp" },
    { category: "Lunch Plated", name: "Plated Lunch Alternating Service", price: 10, unit: "pp_per_course" },

    // ---------- LUNCH — WORKING ----------
    { category: "Working Lunch", name: "Working Lunch Menu One", price: 44, unit: "pp", composition: { set: "workingLunch", limits: { sandwich: 3, salad: 1 } }, note: "Select 3 sandwiches and 1 salad; incl. coffee & tea (max 1 hr).", aliases: ["Sandwich Buffet Menu One", "Sandwich Buffet One"] },
    { category: "Working Lunch", name: "Working Lunch Menu Two", price: 49, unit: "pp", composition: { set: "workingLunch", limits: { sandwich: 4 } }, note: "Select 4 sandwiches; incl. seasonal fruit platter.", aliases: ["Sandwich Buffet Menu Two", "Sandwich Buffet Two"] },
    { category: "Working Lunch", name: "Working Lunch Menu Three", price: 62, unit: "pp", composition: { set: "workingLunch", limits: { sandwich: 4 } }, note: "Select 4 sandwiches (premium selection).", aliases: ["Sandwich Buffet Menu Three", "Sandwich Buffet Three"] },

    // ---------- LUNCHBOX ----------
    { category: "Lunchbox", name: "Lunchbox Package", price: 48.5, unit: "pp", composition: { set: "lunchbox", options: ["Menu One", "Menu Two", "Menu Three", "Menu Four"], maxOptions: 2 }, note: "$48.50 per person; maximum two menu options per function.", aliases: ["Lunch Box", "Lunchbox Menu One", "Lunchbox Menu Two", "Lunchbox Menu Three", "Lunchbox Menu Four"] },

    // ---------- BREAKFAST ----------
    { category: "Breakfast Plated", name: "Plated Breakfast Menu One", price: 56, unit: "pp", minGuests: 30,
      breakfast: { bakery: 1, continental: 1, pan: 1 },
      note: "Select 1 from the bakery, 1 continental, 1 from the pan; incl. coffee, tea & juice.",
      aliases: ["Breakfast Plated Menu One", "Plated Breakfast One", "Breakfast Set Menu One", "Breakfast Set One"] },
    { category: "Breakfast Plated", name: "Plated Breakfast Menu Two", price: 60, unit: "pp", minGuests: 30,
      breakfast: { bakery: 2, continental: 1, pan: 1 },
      note: "Both bakery items, 1 continental, 1 from the pan; incl. coffee, tea & juice.",
      aliases: ["Breakfast Plated Menu Two", "Plated Breakfast Two", "Breakfast Set Menu Two", "Breakfast Set Two"] },
    { category: "Breakfast Buffet", name: "Breakfast Buffet", price: 59.5, unit: "pp", minGuests: 30 },
    { category: "Breakfast Continental", name: "Continental Breakfast", price: 48.5, unit: "pp", minGuests: 30 },
    { category: "Breakfast Standup", name: "Standup Breakfast Egg and Bacon Sliders", price: 30, unit: "pp_per_selection", minGuests: 30 },
    { category: "Breakfast Standup", name: "Standup Breakfast Sliced Tropical Fruit Platter", price: 35, unit: "pp_per_selection" },
    { category: "Breakfast Standup", name: "Standup Breakfast Laugen Croissant", price: 30, unit: "pp_per_selection" },
    { category: "Breakfast Standup", name: "Standup Breakfast Butter Croissant", price: 30, unit: "pp_per_selection" },
    { category: "Breakfast Standup", name: "Standup Breakfast Tropical Bircher Muesli", price: 28, unit: "pp_per_selection" },
    { category: "Breakfast Standup", name: "Standup Breakfast Croque Monsieur", price: 30, unit: "pp_per_selection" },

    // ---------- COFFEE BREAKS ----------
    { category: "Coffee Breaks", name: "Coffee Break One", price: 30, unit: "pp", mustInclude: ["coffee"], breakItems: 1, note: "Select one item from sweet or savoury; incl. coffee, tea & assorted cookies (max 1 hr)." },
    { category: "Coffee Breaks", name: "Coffee Break Two", price: 37, unit: "pp", mustInclude: ["coffee"], breakItems: 2, note: "Select two items from sweet or savoury; incl. coffee, tea & assorted cookies (max 1 hr)." },
    { category: "Coffee Breaks", name: "Coffee Break Three", price: 55, unit: "pp", mustInclude: ["coffee"], breakItems: 4, note: "Select four items from sweet or savoury; incl. coffee, tea & assorted cookies (max 1 hr)." },
    { category: "Coffee Breaks", name: "Tea and Coffee Four Hour", price: 22, unit: "pp", note: "Freshly brewed coffee & selection of teas, 4-hour maximum." },
    { category: "Coffee Breaks", name: "Tea and Coffee Eight Hour", price: 28, unit: "pp", note: "Freshly brewed coffee & selection of teas, 8-hour maximum." },
    { category: "Coffee Breaks", name: "Arrival Tea and Coffee", price: 11, unit: "pp", mustInclude: ["arrival"], note: "Arrival tea & coffee for non–Day Delegate events (under 2 hrs). Day Delegate events use the $8 arrival add-on instead.", aliases: ["Arrival Coffee and Tea", "Arrival Tea & Coffee", "Arrival Tea & Coffee Served", "Arrival Tea and Coffee Served"] },
    { category: "Coffee Breaks", name: "Barista Coffee Cart Half Day", price: 495, unit: "flat" },
    { category: "Coffee Breaks", name: "Barista Coffee Cart Full Day", price: 640, unit: "flat" },
    { category: "Coffee Breaks", name: "Individual Coffee", price: 6.5, unit: "each" },

    // ---------- CREW PACKAGES ----------
    { category: "Crew Packages", name: "Crew Hot Breakfast Plate", price: 31, unit: "pp", note: "Chef's selection; plated functions only, served after function service.", aliases: ["Chefs Selection Hot Breakfast Plate", "Crew Breakfast Plate"] },
    { category: "Crew Packages", name: "Crew Danish and Muffins", price: 10, unit: "pp", aliases: ["Crew Continental Danish and Muffins", "Mini Continental Danish Pastries and Assorted Petite Muffins"] },
    { category: "Crew Packages", name: "Crew Set Menu Main Lunch", price: 39, unit: "pp", note: "Chef's selection main course (served after function service).", aliases: ["Crew Set Menu Lunch", "Crew Main Course Lunch", "Chefs Selection Main Course Lunch"] },
    { category: "Crew Packages", name: "Crew Set Menu Main Dinner", price: 44, unit: "pp", note: "Chef's selection main course (served after function service).", aliases: ["Crew Set Menu Dinner", "Crew Main Course Dinner", "Chefs Selection Main Course Dinner"] },
    { category: "Crew Packages", name: "Crew Set Menu Two Course Lunch", price: 55, unit: "pp", aliases: ["Crew Two Course Lunch", "Chefs Selection 2 Course Lunch"] },
    { category: "Crew Packages", name: "Crew Set Menu Two Course Dinner", price: 61, unit: "pp", aliases: ["Crew Two Course Dinner", "Chefs Selection 2 Course Dinner"] },
    { category: "Crew Packages", name: "Crew Wedges", price: 12, unit: "pp", aliases: ["Crew Wedges with Ketchup Sweet Chilli and Sour Cream"] },
    { category: "Crew Packages", name: "Crew Pies and Sausage Rolls", price: 17, unit: "pp", note: "Chef's selection, 4 pieces per person.", aliases: ["Crew Pies and Sausage Rolls 4 Pieces"] },
    { category: "Crew Packages", name: "Crew Mini Gourmet Quiches", price: 16, unit: "pp", aliases: ["Chefs Selection Mini Gourmet Quiches", "Assortment of Mini Quiches", "Assortment of Mini Gourmet Quiches", "Mini Quiches"] },
    { category: "Crew Packages", name: "Crew Sandwiches Platter", price: 19.5, unit: "each", note: "Per platter — chef's selection of sandwiches.", aliases: ["Crew Sandwich Platter", "Chefs Selection of Sandwiches"] },
    { category: "Crew Packages", name: "Crew Mini Muffins Platter", price: 8, unit: "each", aliases: ["Crew Assortment of Mini Muffins"] },
    { category: "Crew Packages", name: "Crew Cheese Platter", price: 24, unit: "each", aliases: ["Crew Cheese Platter with Crackers"] },
    { category: "Crew Packages", name: "Crew Fresh Fruit Platter", price: 12.5, unit: "each", aliases: ["Crew Sliced Seasonal Fresh Fruit", "Crew Seasonal Fruit Platter"] },
    { category: "Crew Packages", name: "Crew Sushi Platter", price: 12, unit: "each" },
    { category: "Crew Packages", name: "Crew Turkish Bread and Dips", price: 12, unit: "each" },
    { category: "Crew Packages", name: "Crew Buffet Package", price: 42, unit: "pp", minGuests: 20, note: "Chef's selection of salad, sandwiches, hot dish & dessert; buffet style (max 2 hrs). Min 20 guests." },

    // ---------- DAY DELEGATE (price varies — not fixed in the menu) ----------
    { category: "Day Delegate", name: "Day Delegate Package One", price: null, unit: "pp", minGuests: 30, priceVaries: true, note: "Includes morning tea, lunch, afternoon tea, main plenary room hire, mints & water, lectern & mic, notepads & pens. Breaks: select one sweet OR savoury item each (max 30 min); lunch is a daily set menu (max 1 hr). Price varies — confirm against the quote.", aliases: ["Day Delegate One", "DDP One", "Day Delegate Package 1"] },
    { category: "Day Delegate", name: "Day Delegate Package Two", price: null, unit: "pp", minGuests: 30, priceVaries: true, note: "As Package One, plus a sandwich and an extra dessert / fruit platter at lunch. Price varies — confirm against the quote.", aliases: ["Day Delegate Two", "DDP Two", "Day Delegate Package 2"] },
    { category: "Day Delegate", name: "Day Delegate Arrival Coffee and Tea", price: 8, unit: "pp", mustInclude: ["arrival"], note: "Optional arrival coffee & tea add-on ($8 per person).", aliases: ["Arrival Coffee and Tea", "Arrival Tea and Coffee"] },

    // ---------- CANAPÉS / COCKTAIL RECEPTION ----------
    { category: "Canapes", name: "Cocktail Reception One Hour", price: 39, unit: "pp", minGuests: 30, note: "1 hour / select four canapés per person.", aliases: ["Cocktail Reception 4 Canapes", "Cocktail Reception Four Canapes"] },
    { category: "Canapes", name: "Cocktail Reception Two Hour", price: 58, unit: "pp", minGuests: 30, note: "2 hours / select six canapés per person.", aliases: ["Cocktail Reception 6 Canapes", "Cocktail Reception Six Canapes"] },
    { category: "Canapes", name: "Cocktail Reception Three Hour", price: 75, unit: "pp", minGuests: 30, note: "3 hours / select ten canapés per person.", aliases: ["Cocktail Reception 10 Canapes", "Cocktail Reception Ten Canapes"] },
    { category: "Canapes", name: "Cocktail Reception Four Hour", price: 88, unit: "pp", minGuests: 30, note: "4 hours / select twelve canapés per person.", aliases: ["Cocktail Reception 12 Canapes", "Cocktail Reception Twelve Canapes"] },
    { category: "Canapes", name: "Substantial Enhancement", price: 17, unit: "pp_per_selection" },
    { category: "Canapes", name: "Carvery Station", price: 42, unit: "pp_per_selection" },
    { category: "Canapes", name: "Oyster Station Three Pieces", price: 26, unit: "pp" },
    { category: "Canapes", name: "Oyster Station Six Pieces", price: 52, unit: "pp" },
    { category: "Canapes", name: "Taco Station", price: 29, unit: "pp" },

    // ---------- BEVERAGE PACKAGES (per person, incl. soft drink + OJ) ----------
    { category: "Beverage Package", name: "Crown Reserve Package - 2 Hour", price: 54, unit: "pp" },
    { category: "Beverage Package", name: "Crown Reserve Package - 3 Hour", price: 58, unit: "pp" },
    { category: "Beverage Package", name: "Crown Reserve Package - 4 Hour", price: 62, unit: "pp" },
    { category: "Beverage Package", name: "Crown Reserve Package - 5 Hour", price: 66, unit: "pp" },
    { category: "Beverage Package", name: "Crown Reserve Package - 6 Hour", price: 70, unit: "pp" },
    { category: "Beverage Package", name: "Crown Deluxe Package - 2 Hour", price: 65, unit: "pp" },
    { category: "Beverage Package", name: "Crown Deluxe Package - 3 Hour", price: 70, unit: "pp" },
    { category: "Beverage Package", name: "Crown Deluxe Package - 4 Hour", price: 75, unit: "pp" },
    { category: "Beverage Package", name: "Crown Deluxe Package - 5 Hour", price: 80, unit: "pp" },
    { category: "Beverage Package", name: "Crown Deluxe Package - 6 Hour", price: 85, unit: "pp" },
    { category: "Beverage Package", name: "WA Premium Package - 2 Hour", price: 85, unit: "pp" },
    { category: "Beverage Package", name: "WA Premium Package - 3 Hour", price: 94, unit: "pp" },
    { category: "Beverage Package", name: "WA Premium Package - 4 Hour", price: 101, unit: "pp" },
    { category: "Beverage Package", name: "WA Premium Package - 5 Hour", price: 108, unit: "pp" },
    { category: "Beverage Package", name: "WA Premium Package - 6 Hour", price: 115, unit: "pp" },
    { category: "Beverage Package", name: "Soft Drink Only Package - 1 Hour", price: 16, unit: "pp", aliases: ["Soft Drink Package - 1 Hour"] },
    { category: "Beverage Package", name: "Soft Drink Only Package - 2 Hour", price: 18, unit: "pp", aliases: ["Soft Drink Package - 2 Hour"] },
    { category: "Beverage Package", name: "Soft Drink Only Package - 3 Hour", price: 20, unit: "pp", aliases: ["Soft Drink Package - 3 Hour"] },
    { category: "Beverage Package", name: "Soft Drink Only Package - 4 Hour", price: 22, unit: "pp", aliases: ["Soft Drink Package - 4 Hour"] },
    { category: "Beverage Package", name: "Soft Drink Only Package - 5 Hour", price: 24, unit: "pp", aliases: ["Soft Drink Package - 5 Hour"] },
    { category: "Beverage Package", name: "Soft Drink Only Package - 6 Hour", price: 26, unit: "pp", aliases: ["Soft Drink Package - 6 Hour"], note: "6-hour tier not printed in the 2026 menu (listed to 5 hrs); $26 continues the +$2/hour pattern." },
    { category: "Beverage Package", name: "Additional Deluxe Wine Selection", price: 10, unit: "pp_per_selection" },
    { category: "Beverage Package", name: "Additional WA Premium Wine Selection", price: 15, unit: "pp_per_selection" },
    { category: "Beverage Package", name: "Additional Beer or Cider Selection", price: 4.5, unit: "pp_per_selection" },

    // ---------- COCKTAILS (each, min 50) ----------
    { category: "Cocktails", name: "Cosmopolitan", price: 21, unit: "each" },
    { category: "Cocktails", name: "Strawberry Mojito", price: 23, unit: "each" },
    { category: "Cocktails", name: "Aperol Spritz", price: 21, unit: "each" },
    { category: "Cocktails", name: "Elderflower Gin Spritz", price: 21, unit: "each" },
    { category: "Cocktails", name: "Negroni", price: 21, unit: "each" },
    { category: "Cocktails", name: "Margarita", price: 21, unit: "each" },
    { category: "Cocktails", name: "Old Fashioned", price: 23, unit: "each" },
    { category: "Cocktails", name: "Crown Sunrise", price: 21, unit: "each" },
    { category: "Cocktails", name: "Virgin Apple Mojito", price: 14.5, unit: "each" },
    { category: "Cocktails", name: "Virgin Strawberry Mojito", price: 14.5, unit: "each" },
    { category: "Cocktails", name: "Virgin Crown Sunrise", price: 14.5, unit: "each" },
    { category: "Cocktails", name: "Elderflower Citrus Spritz", price: 14.5, unit: "each" },
    { category: "Cocktails", name: "Cranberry Ginger Fizz", price: 14.5, unit: "each" },

    // ---------- BEER & CIDER (each, on consumption) ----------
    { category: "Beer and Cider", name: "Corona", price: 13.5, unit: "each" },
    { category: "Beer and Cider", name: "Heineken Zero", price: 12.5, unit: "each" },
    { category: "Beer and Cider", name: "Heineken", price: 13.5, unit: "each" },
    { category: "Beer and Cider", name: "Peroni", price: 13.5, unit: "each" },
    { category: "Beer and Cider", name: "Guinness", price: 15.5, unit: "each" },
    { category: "Beer and Cider", name: "James Squire Orchard Crush Apple Cider", price: 13.5, unit: "each" },
    { category: "Beer and Cider", name: "Hahn Premium Light", price: 11.5, unit: "each" },
    { category: "Beer and Cider", name: "Hahn Super Dry 3.5", price: 11.5, unit: "each" },
    { category: "Beer and Cider", name: "Rogers Amber Ale", price: 12.5, unit: "each" },
    { category: "Beer and Cider", name: "Little Creatures Pale Ale", price: 13.5, unit: "each" },
    { category: "Beer and Cider", name: "Carlton Dry", price: 12.5, unit: "each" },
    { category: "Beer and Cider", name: "Crown Lager", price: 12.5, unit: "each" },

    // ---------- WINE (per bottle) ----------
    { category: "Wine — Sparkling", name: "Leeuwin Estate Sparkling Brut", price: 75, unit: "bottle" },
    { category: "Wine — Sparkling", name: "Veuve Tailhan Blanc de Blancs Brut NV", price: 60, unit: "bottle" },
    { category: "Wine — Sparkling", name: "Chandon Brut NV", price: 85, unit: "bottle" },
    { category: "Wine — Sparkling", name: "Moet et Chandon NV", price: 175, unit: "bottle" },
    { category: "Wine — Sparkling", name: "Veuve Clicquot Brut NV", price: 255, unit: "bottle" },
    { category: "Wine — Sparkling", name: "Dom Perignon Brut", price: 625, unit: "bottle" },
    { category: "Wine — White", name: "Leo Buring Clare Valley Riesling", price: 60, unit: "bottle" },
    { category: "Wine — White", name: "Henschke Julius Riesling", price: 90, unit: "bottle" },
    { category: "Wine — White", name: "Leeuwin Estate Art Series Sauvignon Blanc", price: 70, unit: "bottle" },
    { category: "Wine — White", name: "Vasse Felix Filius Sauvignon Blanc Semillon", price: 60, unit: "bottle" },
    { category: "Wine — White", name: "Babich Black Label Pinot Gris", price: 55, unit: "bottle" },
    { category: "Wine — White", name: "Domaine de Montille Bourgogne Le Clos du Chateau Chardonnay", price: 180, unit: "bottle" },
    { category: "Wine — White", name: "Vasse Felix Filius Chardonnay", price: 65, unit: "bottle" },
    { category: "Wine — White", name: "Leeuwin Estate Prelude Vineyards Chardonnay", price: 90, unit: "bottle" },
    { category: "Wine — White", name: "Shaw and Smith M3 Chardonnay", price: 120, unit: "bottle" },
    { category: "Wine — Red", name: "Eddystone Point Pinot Noir", price: 85, unit: "bottle" },
    { category: "Wine — Red", name: "Amelia Park Trellis Cabernet Merlot", price: 65, unit: "bottle" },
    { category: "Wine — Red", name: "Fraser Gallop Cabernet Merlot", price: 60, unit: "bottle" },
    { category: "Wine — Red", name: "Vasse Felix Filius Cabernet Sauvignon", price: 75, unit: "bottle" },
    { category: "Wine — Red", name: "Amelia Park Reserve Cabernet Sauvignon", price: 140, unit: "bottle" },
    { category: "Wine — Red", name: "Leeuwin Estate Prelude Vineyards Cabernet Sauvignon", price: 85, unit: "bottle" },
    { category: "Wine — Red", name: "2019 Penfolds Bin 407 Cabernet Sauvignon", price: 210, unit: "bottle" },
    { category: "Wine — Red", name: "Vasse Felix Filius Shiraz", price: 60, unit: "bottle" },
    { category: "Wine — Red", name: "Leeuwin Estate Art Series Shiraz", price: 80, unit: "bottle" },
    { category: "Wine — Red", name: "Penfolds Bin 28 Shiraz", price: 110, unit: "bottle" },
    { category: "Wine — Dessert & Fortified", name: "Penfolds Club Tawny", price: 40, unit: "bottle" },
    { category: "Wine — Dessert & Fortified", name: "De Bortoli Noble One Botrytis Semillon", price: 70, unit: "bottle" },
    { category: "Wine — Dessert & Fortified", name: "T'Gallant Juliet Moscato", price: 65, unit: "bottle" },
    { category: "Wine — Dessert & Fortified", name: "Penfolds Grandfather Fine Old Tawny", price: 200, unit: "bottle" },
    // Crown Reserve package selection wines — included in the package, not sold by
    // the bottle (no list price). Present so the package checker can recognise them.
    { category: "Wine — Sparkling", name: "Woodbrook Vineyards NV Brut Cuvee", price: null, unit: "bottle", priceVaries: true, note: "Crown Reserve package selection (no bottle price)." },
    { category: "Wine — White", name: "Brigade Block Semillon Sauvignon Blanc", price: null, unit: "bottle", priceVaries: true, note: "Crown Reserve package selection (no bottle price)." },
    { category: "Wine — Red", name: "Abilene Shiraz", price: null, unit: "bottle", priceVaries: true, note: "Crown Reserve package selection (no bottle price)." },

    // ---------- SPIRITS (per glass) ----------
    { category: "Spirits", name: "Ketel One Vodka", price: 15.5, unit: "glass" },
    { category: "Spirits", name: "Tanqueray Gin", price: 15.5, unit: "glass" },
    { category: "Spirits", name: "Bulleit Bourbon", price: 15.5, unit: "glass" },
    { category: "Spirits", name: "Johnnie Walker Black Label", price: 15.5, unit: "glass" },
    { category: "Spirits", name: "Bacardi Rum", price: 15.5, unit: "glass" },
    { category: "Spirits", name: "Bombay Sapphire", price: 15.5, unit: "glass" },
    { category: "Spirits", name: "Chivas Regal 12 Year Old", price: 15.5, unit: "glass" },
    { category: "Spirits", name: "Chivas Regal 18 Year Old", price: 18.5, unit: "glass" },
    { category: "Spirits", name: "Glenfiddich 18 Year Old", price: 29, unit: "glass" },
    { category: "Spirits", name: "Johnnie Walker Blue Label", price: 42.5, unit: "glass" },
    { category: "Spirits", name: "Belvedere", price: 17.5, unit: "glass" },
    { category: "Spirits", name: "Grey Goose", price: 17.5, unit: "glass" },
    { category: "Spirits", name: "Jack Daniel's", price: 15.5, unit: "glass" },
    { category: "Spirits", name: "Wild Turkey", price: 14.5, unit: "glass" },
    { category: "Spirits", name: "Maker's Mark", price: 15.5, unit: "glass" },
    { category: "Spirits", name: "Gentleman Jack", price: 16.5, unit: "glass" },
    { category: "Spirits", name: "Jameson 12 Year Old", price: 14.5, unit: "glass" },
    { category: "Spirits", name: "Don Julio Blanco", price: 16.5, unit: "glass" },
    { category: "Spirits", name: "El Jimador Reposado", price: 15.5, unit: "glass" },
    { category: "Spirits", name: "Cointreau", price: 14.5, unit: "glass" },
    { category: "Spirits", name: "Wild Turkey American Honey", price: 14.5, unit: "glass" },
    { category: "Spirits", name: "Bailey's Irish Cream", price: 14.5, unit: "glass" },
    { category: "Spirits", name: "Kahlua", price: 14.5, unit: "glass" },
    { category: "Spirits", name: "Malibu", price: 14.5, unit: "glass" },
    { category: "Spirits", name: "Penfolds Grandfather Fine Old Tawny (Glass)", price: 18.5, unit: "glass" },
    { category: "Spirits", name: "Pimm's No. 1", price: 12.5, unit: "glass" },
    { category: "Spirits", name: "Campari", price: 11.5, unit: "glass" },
    { category: "Spirits", name: "Remy Martin XO", price: 33, unit: "glass" },
    { category: "Spirits", name: "Hennessey VSOP", price: 17.5, unit: "glass" },
    { category: "Spirits", name: "Hennessey XO", price: 34, unit: "glass" },

    // ---------- NON-ALCOHOLIC ----------
    { category: "Non-Alcoholic", name: "Soft Drink (Glass)", price: 6.5, unit: "glass" },
    { category: "Non-Alcoholic", name: "Soft Drink (Bottle)", price: 7.5, unit: "bottle" },
    { category: "Non-Alcoholic", name: "Fruit Juice (Glass)", price: 6.5, unit: "glass" },
    { category: "Non-Alcoholic", name: "Spring Valley Juice (Bottle)", price: 7.5, unit: "bottle" },
    { category: "Non-Alcoholic", name: "Acqua Panna Still Mineral Water 250ml", price: 6.5, unit: "bottle" },
    { category: "Non-Alcoholic", name: "San Pellegrino Sparkling Mineral Water 250ml", price: 6.5, unit: "bottle" }
  ];

  // Standard inclusion note for the hourly beverage packages.
  ITEMS.forEach(function (it) {
    if (it.category === "Beverage Package" && /Reserve|Deluxe|Premium|Soft Drink/.test(it.name) && !it.note) {
      it.note = "Per person, includes assorted soft drinks & orange juice.";
    }
  });

  // Tag every item as food or beverage. BEO "Menu" items are checked against
  // the food price books; BEO "Beverage" items against the beverage price books.
  var BEVERAGE_CATEGORIES = {
    "Beverage Package": 1, "Cocktails": 1, "Beer and Cider": 1, "Spirits": 1, "Non-Alcoholic": 1
  };
  ITEMS.forEach(function (it) {
    it.group = (/^wine/i.test(it.category) || BEVERAGE_CATEGORIES[it.category]) ? "beverage" : "food";
  });

  // Charge lines that are NOT menu-priced. The checker will not price-check
  // these against the catalogue; it only verifies their internal maths and
  // whether the BEO and SOC agree. Kept here so the UI can explain them.
  var NON_MENU_HINTS = [
    "attrition", "minimum spend", "event spend", "audio visual", "av ", "encore",
    "security", "room hire", "venue hire", "room rental", "cleaning",
    "contractor pass", "accommodation", "theming", "staging", "pinboard",
    "linen", "deposit", "surcharge", "delivery", "coat check", "cloak"
  ];

  // ---- Beverage-package composition, for add-on surcharge checks ----
  // Standard inclusions for every hourly package: 1 sparkling + 1 white + 1 red,
  // plus the beer groups below (one beer per group — "Corona OR Heineken" is a
  // single choice). Anything beyond that adds a per-person surcharge:
  //   extra beer or cider          +$4.50pp
  //   extra wine (Crown Deluxe)    +$10pp
  //   extra wine (WA Premium)      +$15pp
  var PACKAGE_INCLUSIONS = {
    "Crown Reserve Package": {
      // Corona OR Heineken is the only either/or; both Hahns are standard inclusions.
      beerGroups: [["Corona", "Heineken"], ["Hahn Super Dry 3.5"], ["Hahn Premium Light"], ["Heineken Zero"]]
    },
    "Crown Deluxe Package": {
      beerGroups: [["Corona", "Heineken"], ["Hahn Super Dry 3.5"], ["Hahn Premium Light"], ["Heineken Zero"]]
    },
    "WA Premium Package": {
      beerGroups: [["Corona"], ["Little Creatures Pale Ale"], ["Rogers Amber Ale"], ["Heineken"],
        ["Hahn Super Dry 3.5"], ["Hahn Premium Light"], ["Heineken Zero"]]
    }
  };
  // Which selection list each package wine belongs to (sets the extra-wine price).
  var WINE_TIER = {
    "Woodbrook Vineyards NV Brut Cuvee": "reserve",
    "Brigade Block Semillon Sauvignon Blanc": "reserve",
    "Abilene Shiraz": "reserve",
    "Veuve Tailhan Blanc de Blancs Brut NV": "deluxe",
    "Vasse Felix Filius Sauvignon Blanc Semillon": "deluxe",
    "Vasse Felix Filius Chardonnay": "deluxe",
    "Vasse Felix Filius Shiraz": "deluxe",
    "Vasse Felix Filius Cabernet Sauvignon": "deluxe",
    "Leeuwin Estate Sparkling Brut": "wapremium",
    "Leeuwin Estate Art Series Sauvignon Blanc": "wapremium",
    "Leeuwin Estate Prelude Vineyards Chardonnay": "wapremium",
    "Leeuwin Estate Art Series Shiraz": "wapremium",
    "Leeuwin Estate Prelude Vineyards Cabernet Sauvignon": "wapremium"
  };
  // Only Crown Deluxe and WA Premium wines can be added to a package. Reserve
  // wines and any other wine are not valid add-ons and must be flagged.
  var PACKAGE_SURCHARGES = { extraBeer: 4.5, extraWine: { deluxe: 10, wapremium: 15 } };

  // Distinctive keywords that identify each plated-breakfast selection, used to
  // count how many items a BEO picked per category against the allowed number.
  var BREAKFAST_SELECTIONS = {
    bakery: ["croissant", "petite muffin"],
    continental: ["fresh fruit platter", "bircher"],
    pan: ["eggs benedict", "focaccia", "croustade", "crushed avocado", "poached egg", "grilled sourdough"]
  };

  // Composition sets: distinctive dish phrases for each selection-based menu,
  // grouped by the course category the menu counts. The checker reads the
  // dishes a BEO listed under a menu line, counts how many land in each
  // category, and flags any category that exceeds the menu's allowance. Each
  // menu item points to one set via `composition.set` and carries its own
  // per-category limits via `composition.limits`. Phrases are long enough to be
  // unique to one dish and one category so a two-column menu layout can't
  // cross-count.
  var COMPOSITION_SETS = {
    // Dinner & Christmas buffets (incl. the Christmas enhancements).
    dinnerBuffet: {
      cold: [
        "tasmanian smoked salmon", "makimono sushi", "gourmet potato, grain mustard",
        "cucumber mint raita", "fresh mozzarella", "aloo chana chaat", "kachumber salad",
        "grilled paneer salad", "southwest style pastrami", "thai beef salad",
        "roasted pumpkin, avocado", "italian cold meat platter", "fremantle octopus",
        "miso glazed king prawn", "salad bar",
        "smoked salmon, watercress", "seafood salad, mango", "roasted sweet potato salad",
        "endive, rocket, fig", "charcuterie platter"
      ],
      hot: [
        "miso salmon, bok choy", "lamb ragu", "fritto misto", "stir fried beef bulgogi",
        "mongolian hoisin", "aloo bhaji", "chinese bbq pork", "pork scotch fillet",
        "vegetable korma", "chana masala", "lamb rump, piperade", "braised pork belly",
        "angus beef fillet", "chicken fricassee", "butter chicken", "malaysian percik",
        "lamb rogan josh", "wa local fish", "matar paneer",
        "marmalade glazed ham", "paprika lacquered wa snapper", "mount barker free range chicken",
        "wa grass fed beef fillet", "charred lamb cutlets", "salmon fillets, king prawns, capers"
      ],
      pasta: [
        "pumpkin ravioli", "ratatouille lasagne", "gnocchi, basil pesto", "porcini mushroom ravioli"
      ],
      side: [
        "wok fried rice", "truffled mashed potato", "garlic naan", "stir fried asian greens",
        "asparagus, root vegetables", "miso glazed eggplant", "bombay gourmet potato",
        "roasted chat potatoes", "heirloom carrots, brussels sprouts",
        "kipfler potato, rosemary", "roasted cauliflower and carrots"
      ],
      dessert: [
        "layered opera gateaux", "mint chocolate mini bombe", "coconut sago mango pudding",
        "mango lassi chia pudding", "lemongrass flan", "strawberry rhubarb tart",
        "traditional treacle tart", "crispy matcha dark chocolate mousse", "gajar halwa",
        "gulab jamun", "lime financier", "key lime curd", "rhubarb elderflower curd",
        "ras malai", "lychee, coconut panna cotta", "roasted sesame dark chocolate mousse",
        "gourmet cheeses, figs", "seasonal fruit platter",
        "cherry pavlova", "traditional christmas pudding", "black forest yule log",
        "vanilla chestnut custard", "orange savarin"
      ]
    },
    // Lunch Buffet Menu Three — the custom build. (Menu One / Two are fixed
    // daily set menus with nothing for the guest to select, so they aren't
    // composition-checked.)
    lunchBuffet: {
      sandwich: [
        "chicken caesar salad", "tuna, celery, caper", "egg, charred corn, chive",
        "egg, sweet corn, chive", "black forest ham, pickle relish", "reuben"
      ],
      "cold savoury": [
        "tasmanian smoked salmon", "assorted sushi nigiri", "char siu pork",
        "sliced duck breast", "sliced porchetta", "tandoori chicken breast",
        "italian cold meat platter"
      ],
      salad: [
        "quinoa, asparagus, heirloom", "roasted pumpkin, pine nuts", "fresh mozzarella, vine tomato",
        "southern style potato salad", "baby cos lettuce, parmesan", "shitake salad",
        "salad station"
      ],
      hot: [
        "lamb ragu", "fritto misto", "barramundi, sea herbs", "ratatouille lasagne",
        "chicken breast, piperade", "baked tortellini", "angus beef fillet",
        "wholemeal ravioli", "goldband snapper", "slow roasted lamb rump", "butter chicken",
        "gnocchi, tomato cream", "pumpkin ravioli, baby kale", "salmon, capers, semi dried tomato"
      ],
      dessert: [
        "apple custard, hazelnut sponge", "crispy matcha dark chocolate mousse",
        "honey roasted pecan and fig", "vanilla cheesecake, caramelised nashi",
        "medjool date cake", "almond sponge, rosewater", "banana custard cream, salted caramel",
        "seasonal fruit platter", "gourmet cheeses, figs"
      ]
    },
    // Indian buffet (Package One / Two / Vegetarian). "bread" is the "select
    // two" naan / paratha line.
    indianBuffet: {
      "entrée": [
        "onion bhaji", "lamb curry puff", "vegetarian samosa", "vegetable curry puffs", "aloo tikki"
      ],
      salad: [
        "spiced cauliflower, onion salad", "aloo chana chaat", "cucumber mint raita",
        "kachumbar", "kachumber", "spiced basmati rice salad", "grilled paneer salad"
      ],
      "meat/fish": [
        "lamb dalcha", "malabar fish curry", "chicken chettinad", "badami lamb korma",
        "lamb rogan josh", "murgh kali mirch", "murg malai tikka", "methi malai murgh",
        "harra barra kebab", "butter chicken"
      ],
      veg: [
        "dum aloo", "dhingri matar", "vegetable jalfrezi", "kadai subzi", "navratan vegetable korma"
      ],
      paneer: [
        "mattar paneer", "paneer labadar", "paneer makhanwala", "paneer achari"
      ],
      dahl: [
        "chana masala", "dal tadka", "dal makhani", "panchrangi dal"
      ],
      rice: [
        "jeera pilaf", "vegetable biryani", "steamed basmati rice"
      ],
      dessert: [
        "semolina pudding, rose", "bhapa doi", "mango lassi chia pudding",
        "cardamon chai milk chocolate mousse", "gulab jamun", "gajar halwa", "ras malai",
        "shahi tukra", "seasonal fruit platter"
      ],
      bread: [
        "plain naan", "garlic naan", "plain paratha"
      ]
    },
    // Children's menu — one main + one dessert per child.
    children: {
      main: [
        "chicken breast, mashed potato", "mini beef sliders", "chicken nuggets", "fish and chips"
      ],
      dessert: [
        "ice cream sundae", "cherry rocky road"
      ]
    },
    // Working Lunch — sandwich selection (Menu One also picks one salad).
    workingLunch: {
      sandwich: [
        "chicken caesar salad", "tuna, celery, caper", "egg, sweet corn, chive",
        "barbecue pulled pork", "tuna, cos, tomato, charred corn", "roasted chicken, apricot raisin",
        "pastrami, swiss cheese", "grilled halloumi, eggplant", "prosciutto, salami, brie",
        "shaved turkey, chilli coleslaw", "aged cheddar ploughman", "black forest ham, pickle relish",
        "reuben", "guacamole, vine ripened tomato", "turkey, mango chutney", "smoked salmon, horseradish cream"
      ],
      salad: [
        "quinoa, asparagus, heirloom", "southern style potato salad", "baby cos lettuce, parmesan",
        "shitake salad"
      ]
    },
    // Lunchbox — each menu is a fixed box; a function may offer at most two.
    // Signatures are the distinctive items of each of the four boxes.
    lunchbox: {
      "Menu One": [
        "pastrami, swiss cheese, truffle aioli", "quinoa, asparagus, heirloom tomato, feta",
        "fresh fruit salad, light vanilla syrup", "dark chocolate tart, truffle ganache"
      ],
      "Menu Two": [
        "roasted chicken, apricot raisin chutney, jindi brie", "ras el hanout lamb",
        "cherry ripple cheese"
      ],
      "Menu Three": [
        "prosciutto, salami, brie, mesclun, sourdough", "roasted pumpkin, pine nuts, raisins",
        "salad of fresh fruits with passionfruit", "carrot cake, honey roasted walnut"
      ],
      "Menu Four": [
        "california roll", "teriyaki chicken roll", "torched salmon nigiri", "miso glazed tofu",
        "yuzu strawberry tart"
      ]
    }
  };

  // Security officer hourly rate by day of week (00:00–23:59). Charged per
  // officer-hour; the day comes from the event date on the BEO/SOC.
  var SECURITY_RATES = { weekday: 63, saturday: 75, sunday: 86 };

  // Operational staff — charged per staff-hour, like security. Weekday $55/hour,
  // Sunday $70/hour. Saturday rate still to be confirmed (held at the weekday
  // rate until provided).
  var OPERATIONAL_RATES = { weekday: 55, saturday: 55, sunday: 70 };

  // Half-hour beverage-package pricing. A package can run in half-hour steps:
  // the whole-hour tier below it plus one half-hour increment (e.g. a 2.5-hour
  // Crown Reserve is the 2 Hour tier $54 + $2 = $56). Valid only between
  // minHours and maxHours; anything outside is flagged. baseName matches the
  // catalogue tier names ("<baseName> - N Hour").
  var BEVERAGE_HALF_HOUR = {
    "crown reserve": { baseName: "Crown Reserve Package", halfHour: 2, minHours: 2, maxHours: 6 },
    "crown deluxe": { baseName: "Crown Deluxe Package", halfHour: 2.5, minHours: 2, maxHours: 6 },
    "wa premium": { baseName: "WA Premium Package", halfHour: 3.5, minHours: 2, maxHours: 6 }
  };

  var API = {
    meta: CATALOGUE_META,
    items: ITEMS,
    nonMenuHints: NON_MENU_HINTS,
    securityRates: SECURITY_RATES,
    operationalRates: OPERATIONAL_RATES,
    beverageHalfHour: BEVERAGE_HALF_HOUR,
    packageInclusions: PACKAGE_INCLUSIONS,
    wineTier: WINE_TIER,
    packageSurcharges: PACKAGE_SURCHARGES,
    breakfastSelections: BREAKFAST_SELECTIONS,
    compositionSets: COMPOSITION_SETS
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = API;
  }
  root.PRICE_CATALOGUE = API;
})(typeof window !== "undefined" ? window : this);
