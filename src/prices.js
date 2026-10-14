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
    { category: "Dinner Buffet", name: "Dinner Buffet Menu One", price: 90, unit: "pp", minGuests: 50, note: "3 cold, 3 hot, 1 pasta, 1 side, 2 desserts; incl. rolls, coffee & tea (max 2 hrs).", aliases: ["Dinner Buffet Menu 1"] },
    { category: "Dinner Buffet", name: "Dinner Buffet Menu Two", price: 104, unit: "pp", minGuests: 50, note: "4 cold, 4 hot, 1 pasta, 1 side, 3 desserts.", aliases: ["Dinner Buffet Menu 2"] },
    { category: "Dinner Buffet", name: "Dinner Buffet Menu Three", price: 120, unit: "pp", minGuests: 50, note: "5 cold, 4 hot, 1 pasta, 2 sides, 3 desserts (incl. cheese or fruit platter).", aliases: ["Dinner Buffet Menu 3"] },
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
    { category: "Dinner Indian", name: "Indian Buffet Package One", price: 129, unit: "pp", minGuests: 50, note: "2 entrées, 3 salads, 2 meat/fish, 2 veg, 1 paneer, 1 dahl, 1 rice, 3 desserts, 2 breads." },
    { category: "Dinner Indian", name: "Indian Buffet Package Two", price: 150, unit: "pp", minGuests: 50, note: "3 entrées, 4 salads, 3 meat/fish, 3 veg, 1 paneer, 1 dahl, 1 rice, 3 desserts, 2 breads." },
    { category: "Dinner Indian", name: "Indian Buffet Vegetarian Option", price: 126, unit: "pp", minGuests: 50, note: "2 entrées, 3 salads, 4 veg, 1 paneer, 1 dahl, 1 rice, 3 desserts, 2 breads." },

    // ---------- CHINESE BANQUET ----------
    { category: "Chinese Banquet", name: "Chinese Banquet Menu One", price: 160, unit: "pp", minGuests: 50, note: "Entrée, soup, 4 main courses, dessert; incl. Tie Guan Yin tea (10 per table)." },
    { category: "Chinese Banquet", name: "Chinese Banquet Menu Two", price: 175, unit: "pp", minGuests: 50, note: "Entrée, soup, 4 premium main courses, dessert; incl. Tie Guan Yin tea (10 per table)." },
    { category: "Chinese Banquet", name: "Children's Chinese Banquet Menu", price: 40, unit: "pp" },

    // ---------- CHILDREN ----------
    { category: "Children", name: "Children's Main Course", price: 30, unit: "child", mustInclude: ["child", "children", "childrens", "kid", "kids"], aliases: ["Childrens Menu Main Course", "Kids Main"] },
    { category: "Children", name: "Children's Beverages", price: 12.5, unit: "child", mustInclude: ["child", "children", "childrens", "kid", "kids"] },

    // ---------- CHRISTMAS BUFFET (valid to 31 Dec 2026) ----------
    { category: "Christmas Buffet", name: "Christmas Buffet Menu One", price: 90, unit: "pp", minGuests: 50, validTo: "2026-12-31" },
    { category: "Christmas Buffet", name: "Christmas Buffet Menu Two", price: 104, unit: "pp", minGuests: 50, validTo: "2026-12-31" },
    { category: "Christmas Buffet", name: "Christmas Buffet Menu Three", price: 120, unit: "pp", minGuests: 50, validTo: "2026-12-31" },
    { category: "Christmas Buffet", name: "Christmas Buffet Additional Course", price: 16, unit: "pp", validTo: "2026-12-31" },

    // ---------- LUNCH — BUFFET ----------
    { category: "Lunch Buffet", name: "Lunch Buffet Menu One", price: 62, unit: "pp", minGuests: 30, note: "Daily set menu (cold savoury, salad, hot dishes, dessert); incl. rolls, coffee & tea (max 1 hr)." },
    { category: "Lunch Buffet", name: "Lunch Buffet Menu Two", price: 69, unit: "pp", minGuests: 30, note: "Menu One plus a sandwich and extra dessert/fruit platter." },
    { category: "Lunch Buffet", name: "Lunch Buffet Menu Three", price: 88, unit: "pp", minGuests: 30, note: "Custom build: sandwich, cold savoury, salad, 3 hot dishes, 3 desserts." },
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
    { category: "Working Lunch", name: "Working Lunch Menu One", price: 44, unit: "pp" },
    { category: "Working Lunch", name: "Working Lunch Menu Two", price: 49, unit: "pp" },
    { category: "Working Lunch", name: "Working Lunch Menu Three", price: 62, unit: "pp" },

    // ---------- LUNCHBOX ----------
    { category: "Lunchbox", name: "Lunchbox Package", price: 48.5, unit: "pp", aliases: ["Lunch Box", "Lunchbox Menu One", "Lunchbox Menu Two", "Lunchbox Menu Three", "Lunchbox Menu Four"] },

    // ---------- BREAKFAST ----------
    { category: "Breakfast Plated", name: "Plated Breakfast Menu One", price: 56, unit: "pp", minGuests: 30 },
    { category: "Breakfast Plated", name: "Plated Breakfast Menu Two", price: 60, unit: "pp", minGuests: 30 },
    { category: "Breakfast Buffet", name: "Breakfast Buffet", price: 59.5, unit: "pp", minGuests: 30 },
    { category: "Breakfast Continental", name: "Continental Breakfast", price: 48.5, unit: "pp", minGuests: 30 },
    { category: "Breakfast Standup", name: "Standup Breakfast Egg and Bacon Sliders", price: 30, unit: "pp_per_selection", minGuests: 30 },
    { category: "Breakfast Standup", name: "Standup Breakfast Sliced Tropical Fruit Platter", price: 35, unit: "pp_per_selection" },
    { category: "Breakfast Standup", name: "Standup Breakfast Laugen Croissant", price: 30, unit: "pp_per_selection" },
    { category: "Breakfast Standup", name: "Standup Breakfast Butter Croissant", price: 30, unit: "pp_per_selection" },
    { category: "Breakfast Standup", name: "Standup Breakfast Tropical Bircher Muesli", price: 28, unit: "pp_per_selection" },
    { category: "Breakfast Standup", name: "Standup Breakfast Croque Monsieur", price: 30, unit: "pp_per_selection" },

    // ---------- COFFEE BREAKS ----------
    { category: "Coffee Breaks", name: "Coffee Break One", price: 30, unit: "pp", mustInclude: ["coffee"], note: "Select one item from sweet or savoury; incl. coffee, tea & assorted cookies (max 1 hr)." },
    { category: "Coffee Breaks", name: "Coffee Break Two", price: 37, unit: "pp", mustInclude: ["coffee"], note: "Select two items from sweet or savoury; incl. coffee, tea & assorted cookies (max 1 hr)." },
    { category: "Coffee Breaks", name: "Coffee Break Three", price: 55, unit: "pp", mustInclude: ["coffee"], note: "Select four items from sweet or savoury; incl. coffee, tea & assorted cookies (max 1 hr)." },
    { category: "Coffee Breaks", name: "Tea and Coffee Four Hour", price: 22, unit: "pp", note: "Freshly brewed coffee & selection of teas, 4-hour maximum." },
    { category: "Coffee Breaks", name: "Tea and Coffee Eight Hour", price: 28, unit: "pp", note: "Freshly brewed coffee & selection of teas, 8-hour maximum." },
    { category: "Coffee Breaks", name: "Barista Coffee Cart Half Day", price: 495, unit: "flat" },
    { category: "Coffee Breaks", name: "Barista Coffee Cart Full Day", price: 640, unit: "flat" },
    { category: "Coffee Breaks", name: "Individual Coffee", price: 6.5, unit: "each" },

    // ---------- CREW PACKAGES ----------
    { category: "Crew Packages", name: "Crew Hot Breakfast Plate", price: 31, unit: "pp" },
    { category: "Crew Packages", name: "Crew Danish and Muffins", price: 10, unit: "pp" },
    { category: "Crew Packages", name: "Crew Set Menu Main Lunch", price: 39, unit: "pp" },
    { category: "Crew Packages", name: "Crew Set Menu Main Dinner", price: 44, unit: "pp" },
    { category: "Crew Packages", name: "Crew Set Menu Two Course Lunch", price: 55, unit: "pp" },
    { category: "Crew Packages", name: "Crew Set Menu Two Course Dinner", price: 61, unit: "pp" },
    { category: "Crew Packages", name: "Crew Wedges", price: 12, unit: "pp" },
    { category: "Crew Packages", name: "Crew Pies and Sausage Rolls", price: 17, unit: "pp" },
    { category: "Crew Packages", name: "Crew Mini Gourmet Quiches", price: 16, unit: "pp" },
    { category: "Crew Packages", name: "Crew Sandwiches Platter", price: 19.5, unit: "each" },
    { category: "Crew Packages", name: "Crew Mini Muffins Platter", price: 8, unit: "each" },
    { category: "Crew Packages", name: "Crew Cheese Platter", price: 24, unit: "each" },
    { category: "Crew Packages", name: "Crew Fresh Fruit Platter", price: 12.5, unit: "each" },
    { category: "Crew Packages", name: "Crew Sushi Platter", price: 12, unit: "each" },
    { category: "Crew Packages", name: "Crew Turkish Bread and Dips", price: 12, unit: "each" },
    { category: "Crew Packages", name: "Crew Buffet Package", price: 42, unit: "pp", minGuests: 20 },

    // ---------- DAY DELEGATE (price varies — not fixed in the menu) ----------
    { category: "Day Delegate", name: "Day Delegate Package One", price: null, unit: "pp", minGuests: 30, priceVaries: true, note: "AM/PM tea, lunch, plenary room hire, mints & water, lectern/mic, notepads & pens. Price varies — confirm against the quote.", aliases: ["Day Delegate One", "DDP One"] },
    { category: "Day Delegate", name: "Day Delegate Package Two", price: null, unit: "pp", minGuests: 30, priceVaries: true, note: "As Package One, with a sandwich added to lunch. Price varies — confirm against the quote.", aliases: ["Day Delegate Two", "DDP Two"] },

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
    { category: "Beverage Package", name: "Soft Drink Only Package - 1 Hour", price: 16, unit: "pp" },
    { category: "Beverage Package", name: "Soft Drink Only Package - 2 Hour", price: 18, unit: "pp" },
    { category: "Beverage Package", name: "Soft Drink Only Package - 3 Hour", price: 20, unit: "pp" },
    { category: "Beverage Package", name: "Soft Drink Only Package - 4 Hour", price: 22, unit: "pp" },
    { category: "Beverage Package", name: "Soft Drink Only Package - 5 Hour", price: 24, unit: "pp" },
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
      beerGroups: [["Corona", "Heineken"], ["Hahn Super Dry 3.5", "Hahn Premium Light"], ["Heineken Zero"]]
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
  var PACKAGE_SURCHARGES = { extraBeer: 4.5, extraWine: { reserve: 10, deluxe: 10, wapremium: 15 } };

  var API = {
    meta: CATALOGUE_META,
    items: ITEMS,
    nonMenuHints: NON_MENU_HINTS,
    packageInclusions: PACKAGE_INCLUSIONS,
    wineTier: WINE_TIER,
    packageSurcharges: PACKAGE_SURCHARGES
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = API;
  }
  root.PRICE_CATALOGUE = API;
})(typeof window !== "undefined" ? window : this);
