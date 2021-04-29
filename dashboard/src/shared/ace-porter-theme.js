import ace from "brace";

ace["define"](
  "ace/theme/porter",
  ["require", "exports", "module", "ace/lib/dom"],
  (acequire, exports) => {
    exports.isDark = true;
    exports.cssClass = "ace-porter";
    exports.cssText = `.ace-porter, div.ace_content, div.ace_line, div.ace_gutter-cell {\
    font-family: monospace;
    font-size: 14px;
    }
    .ace-porter {
    background-color: #1b1d26;
    }
    .ace-porter .ace_gutter {
    background: #1b1d26;
    color: #929292
    }
    .ace-porter .ace_print-margin {
    width: 1px;
    background: #1b1d26
    }
    .ace-porter .ace_cursor {
    color: #bfc7d5
    }
    .ace-porter .ace_marker-layer .ace_selection {
    background: #32374D
    }
    .ace-porter.ace_multiselect .ace_selection.ace_start {
    box-shadow: 0 0 3px 0px #191919;
    }
    .ace-porter .ace_marker-layer .ace_step {
    background: rgb(102, 82, 0)
    }
    .ace-porter .ace_marker-layer .ace_bracket {
    margin: -1px 0 0 -1px;
    border: 1px solid #BFBFBF
    }
    .ace-porter .ace_marker-layer .ace_active-line {
    background: rgba(215, 215, 215, 0.031)
    }
    .ace-porter .ace_gutter-active-line {
    background-color: rgba(215, 215, 215, 0.031)
    }
    .ace-porter .ace_marker-layer .ace_selected-word {
    border: 1px solid #424242
    }
    .ace-porter .ace_invisible {
    color: #343434
    }
    .ace-porter .ace_keyword,
    .ace-porter .ace_meta,
    .ace-porter .ace_storage,
    .ace-porter .ace_storage.ace_type,
    .ace-porter .ace_support.ace_type {
    color: #ff5572
    }
    .ace-porter .ace_keyword.ace_operator {
    color: #ff5572
    }
    .ace-porter .ace_constant.ace_character,
    .ace-porter .ace_constant.ace_language,
    .ace-porter .ace_constant.ace_numeric,
    .ace-porter .ace_keyword.ace_other.ace_unit,
    .ace-porter .ace_support.ace_constant,
    .ace-porter .ace_variable.ace_parameter {
    color: #F78C6C
    }
    .ace-porter .ace_constant.ace_other {
    color: gold
    }
    .ace-porter .ace_invalid {
    color: yellow;
    background-color: red
    }
    .ace-porter .ace_invalid.ace_deprecated {
    color: #CED2CF;
    background-color: #B798BF
    }
    .ace-porter .ace_fold {
    background-color: #7AA6DA;
    border-color: #DEDEDE
    }
    .ace-porter .ace_entity.ace_name.ace_function,
    .ace-porter .ace_support.ace_function,
    .ace-porter .ace_variable {
    color: #7AA6DA
    }
    .ace-porter .ace_support.ace_class,
    .ace-porter .ace_support.ace_type {
    color: #E7C547
    }
    .ace-porter .ace_heading,
    .ace-porter .ace_string {
    color: #80CBC4
    }
    .ace-porter .ace_entity.ace_name.ace_tag,
    .ace-porter .ace_entity.ace_other.ace_attribute-name,
    .ace-porter .ace_meta.ace_tag,
    .ace-porter .ace_string.ace_regexp,
    .ace-porter .ace_variable {
    color: #ff5572
    }
    .ace-porter .ace_comment {
    color: #949eff
    }
    .ace-porter .ace_indent-guide {
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWNgYGBgYLBWV/8PAAK4AYnhiq+xAAAAAElFTkSuQmCC) right repeat-y;
    }`;

    var dom = acequire("../lib/dom");
    dom.importCssString(exports.cssText, exports.cssClass);
  }
);
