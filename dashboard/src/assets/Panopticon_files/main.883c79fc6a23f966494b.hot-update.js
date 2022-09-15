webpackHotUpdate("main",{

/***/ "./src/Main.tsx":
/*!**********************!*\
  !*** ./src/Main.tsx ***!
  \**********************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* WEBPACK VAR INJECTION */(function(__react_refresh_utils__, __react_refresh_error_overlay__) {/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var styled_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! styled-components */ "./node_modules/styled-components/dist/styled-components.browser.esm.js");
/* harmony import */ var assets_gradient_png__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! assets/gradient.png */ "./src/assets/gradient.png");
/* harmony import */ var components_TitleSection__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! components/TitleSection */ "./src/components/TitleSection.tsx");
/* harmony import */ var _filter_row_FilterRow__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./filter-row/FilterRow */ "./src/filter-row/FilterRow.tsx");
/* harmony import */ var navbar_Navbar__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! navbar/Navbar */ "./src/navbar/Navbar.tsx");
/* harmony import */ var components_Loading__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! components/Loading */ "./src/components/Loading.tsx");
/* harmony import */ var components_TabSelector__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! components/TabSelector */ "./src/components/TabSelector.tsx");
/* harmony import */ var monitor_list_MonitorList__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! monitor-list/MonitorList */ "./src/monitor-list/MonitorList.tsx");
/* harmony import */ var expanded_monitor_ExpandedMonitor__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! expanded-monitor/ExpandedMonitor */ "./src/expanded-monitor/ExpandedMonitor.tsx");
/* harmony import */ var react_router_dom__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! react-router-dom */ "./node_modules/react-router-dom/esm/react-router-dom.js");
__webpack_require__.$Refresh$.runtime = __webpack_require__(/*! ./node_modules/react-refresh/runtime.js */ "./node_modules/react-refresh/runtime.js");
__webpack_require__.$Refresh$.setup(module.i);

var _s2 = __webpack_require__.$Refresh$.signature();

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }













var Main = function Main() {
  _s2();

  var history = Object(react_router_dom__WEBPACK_IMPORTED_MODULE_10__["useHistory"])();

  var _useState = Object(react__WEBPACK_IMPORTED_MODULE_0__["useState"])(false),
      _useState2 = _slicedToArray(_useState, 2),
      authCheckResult = _useState2[0],
      setAuthCheckResult = _useState2[1];

  var _useState3 = Object(react__WEBPACK_IMPORTED_MODULE_0__["useState"])({}),
      _useState4 = _slicedToArray(_useState3, 2),
      projectDict = _useState4[0],
      setProjectDict = _useState4[1];

  var _useState5 = Object(react__WEBPACK_IMPORTED_MODULE_0__["useState"])({}),
      _useState6 = _slicedToArray(_useState5, 2),
      clusterDict = _useState6[0],
      setClusterDict = _useState6[1];

  var _useState7 = Object(react__WEBPACK_IMPORTED_MODULE_0__["useState"])({}),
      _useState8 = _slicedToArray(_useState7, 2),
      clusterToProjectDict = _useState8[0],
      setClusterToProjectDict = _useState8[1];

  var _useState9 = Object(react__WEBPACK_IMPORTED_MODULE_0__["useState"])("all"),
      _useState10 = _slicedToArray(_useState9, 2),
      currentTab = _useState10[0],
      _setCurrentTab = _useState10[1];

  var _useState11 = Object(react__WEBPACK_IMPORTED_MODULE_0__["useState"])(null),
      _useState12 = _slicedToArray(_useState11, 2),
      expandedMonitor = _useState12[0],
      setExpandedMonitor = _useState12[1];

  var _useState13 = Object(react__WEBPACK_IMPORTED_MODULE_0__["useState"])({
    project: [],
    cluster: [],
    category: [],
    priority: [],
    status: []
  }),
      _useState14 = _slicedToArray(_useState13, 2),
      filters = _useState14[0],
      setFilters = _useState14[1];

  var arrayToObject = function arrayToObject(arr, property) {
    var obj = {};
    arr.forEach(function (x) {
      return obj[JSON.stringify(x.id)] = x[property || "name"];
    });
    return obj;
  };

  Object(react__WEBPACK_IMPORTED_MODULE_0__["useEffect"])(function () {
    /* ret2: uncomment
    api
      .authCheck("<token>", {}, {})
      .then((res) => {
        setAuthCheckResult(true);
      })
      .catch((err) => {
        window.location.href = "/api/v1/oauth/google/login";
      });
    */
    setAuthCheckResult(true);
  }, []);
  Object(react__WEBPACK_IMPORTED_MODULE_0__["useEffect"])(function () {
    var params = new URLSearchParams(window.location.search);
    console.log(params.get("bloke"));
    /* ret2: uncomment
    api.listProjects("<token>", {}, {}).then((res) => {
      setProjectDict(arrayToObject(res.data));
    });
     api.listClusters("<token>", {}, {}).then((res) => {
      setClusterDict(arrayToObject(res.data));
      setClusterToProjectDict(arrayToObject(res.data, "project_id"));
    });
    */
    // Dummy project list query

    setTimeout(function () {
      return setProjectDict(arrayToObject([{
        "id": 23,
        "name": "in-dreams"
      }, {
        "id": 24,
        "name": "blue-velvet"
      }, {
        "id": 26,
        "name": "wagon-wheel"
      }, {
        "id": 209,
        "name": "clarity"
      }, {
        "id": 277,
        "name": "watermelon-man"
      }, {
        "id": 32,
        "name": "you-know-how-it-is"
      }, {
        "id": 45,
        "name": "shreddy-kruger"
      }, {
        "id": 96,
        "name": "get-by"
      }, {
        "id": 88,
        "name": "killer-queen"
      }, {
        "id": 4,
        "name": "stairway-to-heaven"
      }]));
    }, 1000); // Dummy cluster list query

    setTimeout(function () {
      var dummyClusters = [{
        "id": 45,
        "name": "alexander-test-aks",
        "project_id": 26
      }, {
        "id": 46,
        "name": "scaling-test-cluster",
        "project_id": 26
      }, {
        "id": 101,
        "name": "wing-wing-staging-asdflkajsdflkjasdf-asdflkjasdflkjasdflkjasdlfkjasdlfkjasldkfjasdflkjasdflkjasdflkjasdf",
        "project_id": 4
      }, {
        "id": 102,
        "name": "comes-and-goes-alskdjflkasjdflkjasdf-asdflkjasdflkjasdflkjasdflkjasdflkjsdfjklsaasdflkjfdjsaklasdflkjfdsa",
        "project_id": 88
      }, {
        "id": 455,
        "name": "clarity-staging",
        "project_id": 209
      }, {
        "id": 456,
        "name": "clarity-production",
        "project_id": 209
      }];
      setClusterDict(arrayToObject(dummyClusters));
      setClusterToProjectDict(arrayToObject(dummyClusters, "project_id"));
    }, 1200);
  }, []);

  if (!authCheckResult) {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(components_Loading__WEBPACK_IMPORTED_MODULE_6__["default"], null);
  }

  var renderContents = function renderContents() {
    return expandedMonitor ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(expanded_monitor_ExpandedMonitor__WEBPACK_IMPORTED_MODULE_9__["ExpandedMonitor"], {
      expandedMonitor: expandedMonitor,
      closeExpanded: function closeExpanded() {
        return setExpandedMonitor(null);
      }
    }) : /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(react__WEBPACK_IMPORTED_MODULE_0___default.a.Fragment, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(components_TitleSection__WEBPACK_IMPORTED_MODULE_3__["default"], null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(DashboardIcon, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(DashboardImage, {
      src: assets_gradient_png__WEBPACK_IMPORTED_MODULE_2__["default"]
    }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(Overlay, null, "P")), "Porter Panopticon"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(InfoSection, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(TopRow, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(InfoLabel, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("i", {
      className: "material-icons"
    }, "info"), " Info")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(Description, null, "This dashboard displays infrastructure monitors across all active Porter Cloud projects.")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(components_TabSelector__WEBPACK_IMPORTED_MODULE_7__["default"], {
      currentTab: currentTab,
      options: [{
        value: "all",
        label: "All"
      }, {
        value: "critical",
        label: "Critical"
      }, {
        value: "high",
        label: "High priority"
      }, {
        value: "low",
        label: "Low priority"
      }],
      setCurrentTab: function setCurrentTab(x) {
        x === "all" ? setFilters(_objectSpread(_objectSpread({}, filters), {}, {
          priority: []
        })) : setFilters(_objectSpread(_objectSpread({}, filters), {}, {
          priority: [{
            value: x
          }]
        }));

        _setCurrentTab(x);
      }
    }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(Br, null), Object.keys(projectDict).length > 0 && Object.keys(clusterDict).length > 0 ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(FadeWrapper, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(_filter_row_FilterRow__WEBPACK_IMPORTED_MODULE_4__["FilterRow"], {
      projectDict: projectDict,
      clusterDict: clusterDict,
      clusterToProjectDict: clusterToProjectDict,
      setFilters: setFilters,
      filters: filters
    }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(Br, null), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(monitor_list_MonitorList__WEBPACK_IMPORTED_MODULE_8__["MonitorList"], {
      projectDict: projectDict,
      clusterDict: clusterDict,
      setExpandedMonitor: setExpandedMonitor,
      filters: filters
    })) : /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(LoadingRow, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(components_Loading__WEBPACK_IMPORTED_MODULE_6__["default"], null)));
  };

  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(StyledMain, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(navbar_Navbar__WEBPACK_IMPORTED_MODULE_5__["default"], null), renderContents());
};

_s2(Main, "RFyQb1FsB2gLrasmA72++zOTM1k=", false, function () {
  return [react_router_dom__WEBPACK_IMPORTED_MODULE_10__["useHistory"]];
});

_c = Main;
/* harmony default export */ __webpack_exports__["default"] = (Main);
var FadeWrapper = styled_components__WEBPACK_IMPORTED_MODULE_1__["default"].div.withConfig({
  displayName: "Main__FadeWrapper",
  componentId: "sc-atiuxc-0"
})(["animation:fadeIn 0.3s;animation-timing-function:ease-out;animation-fill-mode:forwards;@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}"]);
_c2 = FadeWrapper;
var LoadingRow = styled_components__WEBPACK_IMPORTED_MODULE_1__["default"].div.withConfig({
  displayName: "Main__LoadingRow",
  componentId: "sc-atiuxc-1"
})(["width:100%;height:calc(100% - 300px);"]);
_c3 = LoadingRow;
var TopRow = styled_components__WEBPACK_IMPORTED_MODULE_1__["default"].div.withConfig({
  displayName: "Main__TopRow",
  componentId: "sc-atiuxc-2"
})(["display:flex;align-items:center;"]);
_c4 = TopRow;
var Description = styled_components__WEBPACK_IMPORTED_MODULE_1__["default"].div.withConfig({
  displayName: "Main__Description",
  componentId: "sc-atiuxc-3"
})(["color:#8b949f;margin-top:13px;margin-left:2px;font-size:13px;"]);
_c5 = Description;
var InfoLabel = styled_components__WEBPACK_IMPORTED_MODULE_1__["default"].div.withConfig({
  displayName: "Main__InfoLabel",
  componentId: "sc-atiuxc-4"
})(["width:72px;height:20px;display:flex;align-items:center;color:#8b949f;font-size:13px;> i{color:#8b949f;font-size:18px;margin-right:5px;}"]);
_c6 = InfoLabel;
var InfoSection = styled_components__WEBPACK_IMPORTED_MODULE_1__["default"].div.withConfig({
  displayName: "Main__InfoSection",
  componentId: "sc-atiuxc-5"
})(["margin-top:35px;font-family:\"Work Sans\",sans-serif;margin-left:0px;margin-bottom:30px;"]);
_c7 = InfoSection;
var StyledMain = styled_components__WEBPACK_IMPORTED_MODULE_1__["default"].div.withConfig({
  displayName: "Main__StyledMain",
  componentId: "sc-atiuxc-6"
})(["width:100%;padding:45px 40px 45px;overflow:auto;position:relative;"]);
_c8 = StyledMain;
var Br = styled_components__WEBPACK_IMPORTED_MODULE_1__["default"].div.withConfig({
  displayName: "Main__Br",
  componentId: "sc-atiuxc-7"
})(["width:100%;height:20px;"]);
_c9 = Br;
var Overlay = styled_components__WEBPACK_IMPORTED_MODULE_1__["default"].div.withConfig({
  displayName: "Main__Overlay",
  componentId: "sc-atiuxc-8"
})(["height:100%;width:100%;position:absolute;top:0;left:0;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:500;font-family:\"Work Sans\",sans-serif;color:white;"]);
_c10 = Overlay;
var DashboardImage = styled_components__WEBPACK_IMPORTED_MODULE_1__["default"].img.withConfig({
  displayName: "Main__DashboardImage",
  componentId: "sc-atiuxc-9"
})(["height:35px;width:35px;border-radius:5px;box-shadow:0 2px 5px 4px #00000011;"]);
_c11 = DashboardImage;
var DashboardIcon = styled_components__WEBPACK_IMPORTED_MODULE_1__["default"].div.withConfig({
  displayName: "Main__DashboardIcon",
  componentId: "sc-atiuxc-10"
})(["position:relative;height:35px;margin-right:17px;width:35px;border-radius:5px;display:flex;align-items:center;justify-content:center;> i{font-size:22px;}"]);
_c12 = DashboardIcon;

var _c, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c10, _c11, _c12;

__webpack_require__.$Refresh$.register(_c, "Main");
__webpack_require__.$Refresh$.register(_c2, "FadeWrapper");
__webpack_require__.$Refresh$.register(_c3, "LoadingRow");
__webpack_require__.$Refresh$.register(_c4, "TopRow");
__webpack_require__.$Refresh$.register(_c5, "Description");
__webpack_require__.$Refresh$.register(_c6, "InfoLabel");
__webpack_require__.$Refresh$.register(_c7, "InfoSection");
__webpack_require__.$Refresh$.register(_c8, "StyledMain");
__webpack_require__.$Refresh$.register(_c9, "Br");
__webpack_require__.$Refresh$.register(_c10, "Overlay");
__webpack_require__.$Refresh$.register(_c11, "DashboardImage");
__webpack_require__.$Refresh$.register(_c12, "DashboardIcon");

const currentExports = __react_refresh_utils__.getModuleExports(module.i);
__react_refresh_utils__.registerExportsForReactRefresh(currentExports, module.i);

if (true) {
  const isHotUpdate = !!module.hot.data;
  const prevExports = isHotUpdate ? module.hot.data.prevExports : null;

  if (__react_refresh_utils__.isReactRefreshBoundary(currentExports)) {
    module.hot.dispose(
      /**
       * A callback to performs a full refresh if React has unrecoverable errors,
       * and also caches the to-be-disposed module.
       * @param {*} data A hot module data object from Webpack HMR.
       * @returns {void}
       */
      function hotDisposeCallback(data) {
        // We have to mutate the data object to get data registered and cached
        data.prevExports = currentExports;
      }
    );
    module.hot.accept(
      /**
       * An error handler to allow self-recovering behaviours.
       * @param {Error} error An error occurred during evaluation of a module.
       * @returns {void}
       */
      function hotErrorHandler(error) {
        if (
          typeof __react_refresh_error_overlay__ !== 'undefined' &&
          __react_refresh_error_overlay__
        ) {
          __react_refresh_error_overlay__.handleRuntimeError(error);
        }

        if (typeof __react_refresh_test__ !== 'undefined' && __react_refresh_test__) {
          if (window.onHotAcceptError) {
            window.onHotAcceptError(error.message);
          }
        }

        __webpack_require__.c[module.i].hot.accept(hotErrorHandler);
      }
    );

    if (isHotUpdate) {
      if (
        __react_refresh_utils__.isReactRefreshBoundary(prevExports) &&
        __react_refresh_utils__.shouldInvalidateReactRefreshBoundary(prevExports, currentExports)
      ) {
        module.hot.invalidate();
      } else {
        __react_refresh_utils__.enqueueUpdate(
          /**
           * A function to dismiss the error overlay after performing React refresh.
           * @returns {void}
           */
          function updateCallback() {
            if (
              typeof __react_refresh_error_overlay__ !== 'undefined' &&
              __react_refresh_error_overlay__
            ) {
              __react_refresh_error_overlay__.clearRuntimeErrors();
            }
          }
        );
      }
    }
  } else {
    if (isHotUpdate && __react_refresh_utils__.isReactRefreshBoundary(prevExports)) {
      module.hot.invalidate();
    }
  }
}
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./node_modules/@pmmmwh/react-refresh-webpack-plugin/lib/runtime/RefreshUtils.js */ "./node_modules/@pmmmwh/react-refresh-webpack-plugin/lib/runtime/RefreshUtils.js"), __webpack_require__(/*! ./node_modules/@pmmmwh/react-refresh-webpack-plugin/overlay/index.js */ "./node_modules/@pmmmwh/react-refresh-webpack-plugin/overlay/index.js")))

/***/ })

})
//# sourceMappingURL=main.883c79fc6a23f966494b.hot-update.js.map