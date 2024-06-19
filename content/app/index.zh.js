importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");

function sendPatch(patch, buffers, msg_id) {
  self.postMessage({
    type: 'patch',
    patch: patch,
    buffers: buffers
  })
}

async function startApplication() {
  console.log("Loading pyodide!");
  self.postMessage({type: 'status', msg: 'Loading pyodide'})
  self.pyodide = await loadPyodide();
  self.pyodide.globals.set("sendPatch", sendPatch);
  console.log("Loaded!");
  await self.pyodide.loadPackage("micropip");
  const env_spec = ['https://cdn.holoviz.org/panel/wheels/bokeh-3.4.0-py3-none-any.whl', 'https://cdn.holoviz.org/panel/1.4.2/dist/wheels/panel-1.4.2-py3-none-any.whl', 'pyodide-http==0.2.1', 'holoviews', 'hvplot', 'pandas', 'param', 'pyecharts']
  for (const pkg of env_spec) {
    let pkg_name;
    if (pkg.endsWith('.whl')) {
      pkg_name = pkg.split('/').slice(-1)[0].split('-')[0]
    } else {
      pkg_name = pkg
    }
    self.postMessage({type: 'status', msg: `Installing ${pkg_name}`})
    try {
      await self.pyodide.runPythonAsync(`
        import micropip
        await micropip.install('${pkg}');
      `);
    } catch(e) {
      console.log(e)
      self.postMessage({
	type: 'status',
	msg: `Error while installing ${pkg_name}`
      });
    }
  }
  console.log("Packages loaded!");
  self.postMessage({type: 'status', msg: 'Executing code'})
  const code = `
  \nimport asyncio\n\nfrom panel.io.pyodide import init_doc, write_doc\n\ninit_doc()\n\n# #!/usr/bin/env python\n# coding: utf-8\nimport pandas as pd\nimport pyecharts.options as opts\nfrom pyecharts.charts import Graph, Sankey\nfrom bokeh.models.widgets.tables import NumberFormatter, BooleanFormatter\nimport panel as pn\npn.extension(design='fast')     \npn.extension('tabulator')\npn.extension('echarts')  # ECharts\nimport holoviews as hv\nimport hvplot.pandas\nimport param\nimport pickle\n# ----- remote URLs -----\n\nsite_this = {'site_url': 'https://oxon8.github.io/jupyterlite/lab/index.html', 'logo': 'https://oxon8.github.io/jupyterlite/files/icon.svg', 'favicon': 'https://oxon8.github.io/jupyterlite/files/favicon.ico', 'base_url': 'https://oxon8.github.io/jupyterlite/files/'}\nvar_reload = pd.read_pickle ('https://oxon8.github.io/jupyterlite/files/data/pyCEADs.pickle')\ndfE_locale = pd.read_pickle ('https://oxon8.github.io/jupyterlite/files/data/dfE_zh_hans.pickle')\ndfN_locale = pd.read_pickle ('https://oxon8.github.io/jupyterlite/files/data/dfN_zh_hans.pickle')\n\n# +\n# site_this.keys() # ['site_url', 'logo', 'favicon', 'base_url']\n## unpacking for pyCEADs\n\nfor k, v in var_reload.items():\n    cmd = f"{k} = {v}"\n    exec (cmd)    #print (cmd)\n# -\n\n# # Share version\n# ## Varialbes\n\n# +\nlocale = 'zh_hans' # prj_visCEADs\n\n## processed for html\ndfN_locale.loc[:,'ttips'] = dfN_locale.loc[:,'ttips'].str.replace('\\n', '<br/>')   \n## processed for locale True/False\ndfE_locale['IfIntra'] = dfE_locale.loc[:,'IfIntra'].astype(str).map(d_trans[locale])\n\n# ----- variables -----\nUI_label['zh_hans'] = UI_label['zh']  # # zh_hans as zh\n\n# for class CEADsExplorer\nreg_dict_UI = dict(zip(reg_all ['code'], reg_all [locale]))\nreg_dict_UI_joint = [":".join([k,v]) for k,v in reg_dict_UI.items()]\nIndicators_Main = list ( dfN_locale [ ~dfN_locale.ttips.isna() ].index.unique(level='Indicator') )  #Indicators_with_ttips\nIndicators_Secondary = [x for x in sel_indicators_list[locale] if x not in Indicators_Main]\nN_indicators_available, N_indicators  = len(sel_indicators_list[locale]), len(all_indicators_list[locale])\n# Nodes_Energy_List = ['\u91c7\u77f3\u6cb9\u5929\u7136\u6c14','\u91c7\u9009\u7164\u70ad','\u4ea7\u4f9b\u71c3\u6c14','\u4ea7\u4f9b\u7535\u70ed\u529b']\n\n# ----- fstring -----\ndef convert_further_anyway(fstring_text, debug=False):\n    if "</style>" in fstring_text:\n        fstring_text_CSS_block  = fstring_text.split("</style>")[0] + "</style>"\n        fstring_text_to_process = fstring_text.split("</style>")[1] + "</style>"\n        return fstring_text_CSS_block + eval(f'f"""{fstring_text_to_process}"""')\n    else:\n        fstring_text_to_process = fstring_text\n        return eval(f'f"""{fstring_text_to_process}"""')\n# -------------------\n\n\n\n# -\n\n# ## Functions\n\n# ----- fstring -----\ndef convert_further_anyway(fstring_text, debug=False):\n    if "</style>" in fstring_text:\n        fstring_text_CSS_block  = fstring_text.split("</style>")[0] + "</style>"\n        fstring_text_to_process = fstring_text.split("</style>")[1] + "</style>"\n        return fstring_text_CSS_block + eval(f'f"""{fstring_text_to_process}"""')\n    else:\n        fstring_text_to_process = fstring_text\n        return eval(f'f"""{fstring_text_to_process}"""')\n# ----- bokeh formatters -----\ndef generate_bokeh_formatters (columns_fmtstr, d_trans=d_trans, locale=locale):\n    bokeh_formatters = { d_trans[locale][k]: NumberFormatter(format=format_str) for k, format_str in columns_fmtstr.items() }\n    return bokeh_formatters\ncol_fmt_dict = {"value":'0,0.000',"perc":'0.00%',"pctl":'0.00%'}\ncol_fmt_dict_bokeh = generate_bokeh_formatters(col_fmt_dict)\n# to be used at pn.widgets.Tabulator(TBL, formatters=col_fmt_dict_bokeh, ...\n# -------------------\n\n\n# ## Panel outline and design\n\n# ### Layout, CSS, etc.\n\n\n\n# +\n### defined for pn.template.FastGridTemplate\nLayout_width = {"en":{"sidebar":250, "OverlayMain":790, "Echart":1000, "Selector_default":200,\n                      "Tabulator_column_width":165, 'Tabulator_column_width_IndicatorsAcross':  [200, 135, 85, 90,90, 135, 85] },\n                "zh_hans":{"sidebar":240, "OverlayMain":800, "Echart":1000, "Selector_default":200, \n                      "Tabulator_column_width":105, 'Tabulator_column_width_IndicatorsAcross':  [180, 90, 80,  90,90,  90, 80] }\n               }\nTabulator_page_size = 10\n\n### defined for Widget Tabs:  CSS styles\nraw_css_custom_tabs = """\n.bk-header {\n    font-size: 18px;\n    line-height: 18px;\n    color: #272727;\n}\n.bk-tab.bk-active {\n    color: #ffff00;\n    border-color: #002147 !important;\n    border-bottom-width: 3px;\n}\n:host .bk-tab:nth-of-type(1) {\n    background-color: #fdc086 !important;\n}\n:host .bk-tab:nth-of-type(2) {\n    background-color: #86c3fd !important;\n}\n:host .bk-tab:nth-of-type(3) {\n    background-color: #86fdc0 !important;\n}\n:host .bk-tab:nth-of-type(4) {\n    background-color: #fd86c3 !important;\n}\n"""\nraw_css_custom_tabs_Node = """\n.bk-header {\n    font-size: 18px;\n    line-height: 18px;\n    color: #272727;\n}\n:host(.bk-above) .bk-tab{\n    min-width: 220px;\n}\n.bk-tab.bk-active {\n    color:#ffff00;\n    border-color: #002147 !important;\n    border-bottom-width: 1px;\n}\n:host .bk-tab:nth-of-type(1) {\n    background-color: #9bbf7c !important;\n}\n:host .bk-tab:nth-of-type(2) {\n    background-color: #b8d9d4 !important;\n}\n:host .bk-tab:nth-of-type(3) {\n   background-color: #d3e1f2 !important;\n}\n"""\n# -\n\n### Tempalte_Param: variables definition\nDashboardTitle = UI_label[locale]["DashboardTitle"]\ntemplate_param= dict(\n    title = DashboardTitle,\n    main_max_width= "1000px",\n    theme_toggle=False,    \n    sidebar_width = Layout_width[locale]["sidebar"],\n    # sidebar = pn_sidebar,\n    sidebar_footer = f"""<fast-breadcrumb><fast-breadcrumb-item href="https://oxon8.netlify.app">\xa9 2024 Oxford Roadmapping </fast-breadcrumb-item><fast-breadcrumb-item href="https://creativecommons.org/licenses/by-nc-nd/4.0">CC BY NC ND 4.0</fast-breadcrumb-item>\n    <fast-breadcrumb-item href="{UI_label[locale]['url_prj-visNetZero']}">visNetZero</fast-breadcrumb-item></fast-breadcrumb>""",\n    header_color="#002147",  # Oxford blue color https://www.colorxs.com/palette/hex/002147-a3ced9-dae5f2\n    header_background="#e2effe", # https://icolorpalette.com/color/oxford-blue\n    accent_base_color="#0066dc", # https://panel.holoviz.org/reference/templates/FastGridTemplate.html\n    header_neutral_color = "#3f98ff",\n    prevent_collision=False,\n    meta_description = DashboardTitle + " by Oxford Roadmapping",\n    meta_keywords = "China; decarbonization; carbon emission; net zero; roadmapping;",\n    meta_author = "Han-Teng Liao",\n    logo =    site_this['logo'],\n    favicon = site_this['favicon'],\n    site_url = site_this['site_url'],\n    base_url = site_this['base_url'],\n)\n\n\n# ## Class\n\n# +\nclass CEADsExplorer(param.Parameterized):\n    ## Data directly initiated and load\n    sel_reg_localeJ = param.Selector(objects=reg_dict_UI_joint )#reg_all [locale] )   \n    sel_year_locale = param.Selector(objects=year_all [locale])\n    sel_TopN        = param.Selector(objects=list(range(3,8)))\n    sel_indicator_main      = param.Selector(objects=Indicators_Main)\n    sel_indicator_secondary = param.Selector(objects=Indicators_Secondary)\n    sel_indicator_tertiary  = param.Selector(objects=sel_indicators_list[locale])  \n    # class atrributes: dfN; dfE; sel_reg_localeJ; sel_year_locale; sel_indicator_main   all param!\n    ## Data directly initiated and load\n    dfN = param.DataFrame(dfN_locale.sort_index() )  # wrapped with param\n    dfE = param.DataFrame(dfE_locale.sort_index() )  # wrapped with param\n    \n    # define action model \n    # TBA: tabulator selection \n    #   selectable = 'checkbox', selection = []\n    def translate_df_columns (self, df, d_trans=d_trans, locale=locale):\n        return (df.rename (columns=d_trans[locale]))\n    def widget_Tabulator_wrapper (self, df, NorE = "N"):\n        if NorE == "N":\n            tabulator_filters = {\n                '\u8282\u70b9': {'type': 'list', 'func': 'in', 'valuesLookup': True, 'sort': 'asc', 'multiselect': True},\n                '\u503c':  {'type': 'number', 'func': '>=', 'placeholder': '\u8f93\u5165\u6700\u5c0f\u503c\u8fc7\u6ee4'},\n            }\n            TBL = pn.widgets.Tabulator (df, show_index=False, pagination='local', page_size=Tabulator_page_size, theme = "fast", \n                                    formatters=col_fmt_dict_bokeh, text_align="right",\n                                    header_filters=tabulator_filters)\n        elif NorE == "E":\n            tabulator_filters = {\n                '\u6295\u5165': {'type': 'list', 'func': 'in', 'valuesLookup': True, 'sort': 'asc', 'multiselect': True},\n                '\u4ea7\u51fa': {'type': 'list', 'func': 'in', 'valuesLookup': True, 'sort': 'asc', 'multiselect': True},\n                '\u884c\u4e1a\u5185': {'type': 'list', 'func': 'in', 'valuesLookup': True, 'multiselect': True},\n                '\u503c':  {'type': 'number', 'func': '>=', 'placeholder': '\u8f93\u5165\u6700\u5c0f\u503c\u8fc7\u6ee4'},\n            }\n            TBL = pn.widgets.Tabulator (df, show_index=False, pagination='local', page_size=Tabulator_page_size, theme = "fast", \n                                    formatters=col_fmt_dict_bokeh, text_align="right",\n                                    header_filters=tabulator_filters )\n        return TBL\n    \n    def process_param_r (self, r):\n        try:\n            reg = r.split(':')[1]\n        except:\n            reg = r\n        return (reg)\n        \n    @pn.cache\n    def get_df (self, r, y, i=slice(None), n=slice(None),\n                            ei=slice(None), eo=slice(None), NorE = "N"):\n        # processing r\n        reg = self.process_param_r (r)\n        if NorE == "N":\n            df = self.dfN.loc[(reg,y,n,i),:].reset_index()\\\n                         .sort_values('value', ascending=False)\n        elif NorE == "E":\n            df = self.dfE.loc[(reg,y,ei,eo),:].reset_index()\\\n                         .sort_values('value', ascending=False)\n        return  df\n    \n    def get_df_len (self, r, y, i=slice(None), n=slice(None),\n                            ei=slice(None), eo=slice(None), NorE = "N"):\n        df = self.get_df(r=r,y=y,i=i,n=n,ei=ei,eo=eo,NorE=NorE)         \n        return  len(df)\n    \n    def get_df_with_col_translated ( self, r, y, \n                                     i=slice(None), n=slice(None), ei=slice(None), eo=slice(None),\n                                     actions=["TBL_N_remove_cols","translate"], NorE = "N"):\n        # get datasource        \n        df = self.get_df (r,y,i=i,n=n,ei=ei,eo=eo, NorE = NorE)\n        # process actions\n        if "TBL_N_remove_cols" in actions:\n            ## clean up two columns for Tabulator\n            df = df.drop(['weight','ttips'], axis=1) \n        if "TBL_E_remove_cols" in actions:\n            ## clean up one column for Tabulator\n            df = df.drop(['weight'], axis=1) \n        if "translate" in actions:\n            df = self.translate_df_columns (df)\n        return  df\n        \n    def get_TBL (self, r, y, i=slice(None), n=slice(None), ei=slice(None), eo=slice(None), NorE = "N"):\n        if NorE == "N":\n            df = self.get_df_with_col_translated (r,y,i=i,n=n,ei=ei,eo=eo, actions= ["TBL_N_remove_cols","translate"], NorE = NorE)\n            TBL = self.widget_Tabulator_wrapper (df, NorE = NorE )\n        elif NorE == "E":\n            df = self.get_df_with_col_translated (r,y,i=i,n=n,ei=ei,eo=eo, actions= ["TBL_E_remove_cols","translate"], NorE = NorE)\n            TBL = self.widget_Tabulator_wrapper (df, NorE = NorE )\n        return  TBL\n\nmyExplorer = CEADsExplorer()\n# -\n\n# ### myExplorer\n\n# ### myExplorer\nmyExplorer = CEADsExplorer()\n\n# ### associated Widgets \n\n# +\n# Default values for associated widgets\n# Indicators_Main[0], Indicators_Secondary[5], sel_indicators_list[locale][9] # ('CO2\u6392\u653e', '\u51fa\u53e3', '\u78b3\u6392\u5f3a\u5ea6')\n\n# +\n# reg\nwidget_reg_select        = pn.widgets.Select.from_param ( myExplorer.param["sel_reg_localeJ"], \n    width=Layout_width[locale][ "Selector_default"], name=UI_label[locale]['Select region'])\n#widget_reg_autocomplete  = pn.widgets.AutocompleteInput.from_param ( myExplorer.param["sel_reg_localeJ"], \n#    width=Layout_width[locale][ "Selector_default"], name=UI_label[locale]['Input region autocomplete'], case_sensitive=False, search_strategy='includes', min_characters=1,\n#    placeholder='GD')\n# year\nwidget_year_slider = pn.widgets.DiscreteSlider.from_param ( myExplorer.param.sel_year_locale, \n    width=Layout_width[locale][ "Selector_default"], name=UI_label[locale]['Select year'], value=reg_all [locale][0])\n# TopN_slider\n#widget_TopN_slider = pn.widgets.IntSlider.from_param ( myExplorer.param.sel_TopN, \n#    width=Layout_width[locale][ "Selector_default"], name=UI_label[locale]['Select TopN'], \n#                                                      start=3, end=9, step=1, value=7 )\n\n# indicator\nwidget_indicator_main_sel= pn.widgets.Select.from_param ( myExplorer.param["sel_indicator_main"], \n    width=Layout_width[locale][ "Selector_default"], name=UI_label[locale]['Select main indicator'], value=Indicators_Main[0])\nwidget_indicator_secondary_sel= pn.widgets.Select.from_param ( myExplorer.param["sel_indicator_secondary"], \n    width=Layout_width[locale][ "Selector_default"], name=UI_label[locale]['Select secondary indicator'], value=Indicators_Secondary[5])\nwidget_indicator_tertiary_sel= pn.widgets.Select.from_param ( myExplorer.param["sel_indicator_tertiary"], \n    width=Layout_width[locale][ "Selector_default"], name=UI_label[locale]['Select any indicator'], value=sel_indicators_list[locale][9])\n\n# Graph\nwg_slider_gravity   = pn.widgets.FloatSlider(name=UI_label[locale]['Slider Gravity'], \n                                             width=Layout_width[locale][ "Selector_default"],\n                                             #width = int(Layout_width[locale]["Echart"] *.45),\n                                             start=0.05, end=.95, step=0.05, value=0.7)\nwg_slider_repulsion = pn.widgets.IntSlider  (name=UI_label[locale]['Slider Repulsion'], \n                                             width=Layout_width[locale][ "Selector_default"],\n                                             #width = int(Layout_width[locale]["Echart"] *.45),\n                                             start=100, end=2000, step=100, value=1700)\n# -\n\n# ### associated Binds pn.bind\n\n# +\n# ### associated Binds based on Widgets .. common r,y,i\nTBL_E_interactive    = pn.bind( myExplorer.get_TBL, r=myExplorer.param.sel_reg_localeJ, y=myExplorer.param.sel_year_locale,\n                       NorE = "E", #ei=slice(None), eo=slice(None),                                                    \n                       )\nTBL_N_interactive_01 = pn.bind( myExplorer.get_TBL, r=myExplorer.param.sel_reg_localeJ, y=myExplorer.param.sel_year_locale,\n                       i=myExplorer.param.sel_indicator_main,\n                       )\nTBL_N_interactive_02 = pn.bind( myExplorer.get_TBL, r=myExplorer.param.sel_reg_localeJ, y=myExplorer.param.sel_year_locale,\n                       i=myExplorer.param.sel_indicator_secondary,\n                       )\nTBL_N_interactive_03 = pn.bind( myExplorer.get_TBL, r=myExplorer.param.sel_reg_localeJ, y=myExplorer.param.sel_year_locale,\n                       i=myExplorer.param.sel_indicator_tertiary,\n                       )\nTBL_E_interactive_len = pn.bind( myExplorer.get_df_len, r=myExplorer.param.sel_reg_localeJ, y=myExplorer.param.sel_year_locale,\nNorE = "E")\n\n# Other locations:\n# Echart_Graph_inter = pn.bind( gen_Network_Graph, ...\n# Trendlines_inter = pn.bind (gen_Trendlines_TopN_Nodes, ...\n# Sankey_inter = pn.bind (gen_Sankey_TopN_Nodes, ...\n# -\n\n# ## Tabs: Node -----> pn_Node\n\n# +\n### pn_Node/Edge Tabs in a Tab + TBL_E_interactive_len + TBL_E_interactive\n# TBL_N_interactive_01 2 3 \npn_Node_tabs = pn.Tabs( (UI_label[locale]['Main'], TBL_N_interactive_01),\n                         (UI_label[locale]['Secondary'], TBL_N_interactive_02),\n                         (UI_label[locale]['Any'], TBL_N_interactive_03),\n                        stylesheets=[raw_css_custom_tabs_Node],\n)# CSS raw_css_custom_tabs_Node used\n\npn_Node = pn.Column( \n    pn.Row( convert_further_anyway(UI_label[locale]["fTab Node Description"])  ),\n    pn.Row( widget_indicator_main_sel, widget_indicator_secondary_sel, widget_indicator_tertiary_sel),\n    pn_Node_tabs\n)\n### pn_Edge\npn_Edge = pn.Column( \n    pn.Row( pn.pane.Str(UI_label[locale]["fTab Edge Description"]), TBL_E_interactive_len ),\n    TBL_E_interactive\n)\n\n\n# -\n\n# ### Functions for data processing\n\n# +\n#### Mainly for 3. TopN Sankey  TBA + "\uff08\u56de\uff09"\ndef process_Edges_reversed (dft, keep_reversed = True):\n    list_exists=list()\n    # Checking if reversed exists\n    for ind, row in dft.iterrows():\n        pair = dft.loc[ind,['Input','Output']].tolist()\n        if list(reversed(pair)) in list_exists:\n            dft.loc[ind,'ifR'] = True\n        else:\n            dft.loc[ind,'ifR'] = False\n        list_exists.append(pair)\n    if keep_reversed:\n        all_index  = dft[dft.ifR==True].index\n        for i in all_index:\n            dft.loc[i, 'Output'] = dft.loc[i, 'Output'] + "\uff08\u56de\uff09"\n    else:\n        dft = dft[dft.ifR!=True]\n    return (dft)\n\n# process_Edges_reversed(TopN_Edges)\n\n\n# -\n\n# ## pn_sidebar to be reused also in Echart Graph\n\n### pn_sidebar\npn_sidebar = pn.Column( UI_label[locale]["### Explore a year and place"],\n                        widget_year_slider, widget_reg_select, #widget_reg_autocomplete, \n                        pn.layout.Divider(),\n                        UI_label[locale]["### Focus a main indicator"],\n                        widget_indicator_main_sel,\n                        pn.layout.Divider(),\n                        UI_label[locale]["### Adjust the network"],\n                        pn.pane.Str(UI_label[locale]["Visualization parameters"]),\n                        wg_slider_gravity, wg_slider_repulsion, \n                        pn.Accordion( objects = [ pn.pane.Markdown (UI_label[locale]["mdInteractivityTips"], name=UI_label[locale]["Interactivity Tips"])] ),\n                        pn.Accordion( objects = [ pn.pane.Markdown (UI_label[locale]["mdAcknowledgement"],   name=UI_label[locale]["Acknowledgement"])] ),                       \n                   margin = 0 )\n# pn_sidebar\n\n# ## Complex Graphs\n\n# ### 1. Echarts\uff1aInteractive Wigdets for Gravity and Repulsion\n\nfrom pyecharts.globals import ThemeType\n\n\ndef gen_Network_Graph (r, y, i, repulsion, gravity):\n    GdfN = myExplorer.get_df ( r=r, y=y, i=i).dropna() # remove any nodes with no weight values\n    GdfE = myExplorer.get_df ( r=r, y=y, NorE = "E")\n\n    # Echart_nodes\n    Echart_nodes = [\n        opts.GraphNode( name=row['Node'], \n                        value=row['value'],\n                        symbol_size=row['weight'],\n                        tooltip_opts=opts.TooltipOpts(formatter=row['ttips']),\n                        itemstyle_opts=opts.ItemStyleOpts(color=d_color[locale][row['Node']]),\n                        label_opts=opts.LabelOpts(color="#ffff00", font_size=8+int(20*row['weight'])/75),\n                      )\n    for ind, row in GdfN.reset_index().iterrows() ]\n    # Echart_edges\n    Echart_edges = [\n        opts.GraphLink( source=row["Input"], target=row["Output"], value=row["value"], \n                        linestyle_opts=opts.LineStyleOpts(width=row["weight"], curve=0.33, opacity=0.25),                    \n                      )\n    for ind, row in GdfE.reset_index().iterrows() ]  \n    _plot_title_ = UI_label[locale]["fEchart_Graph_Main"].format(r=r, y=y, i=i)\n    label_opts = opts.LabelOpts (font_size=16, rotate=0)\n    \n    Echart_Graph = ( Graph(init_opts=opts.InitOpts(theme=ThemeType.DARK)).add(\n        series_name=f"({r}, {y})",\n        nodes=Echart_nodes, links=Echart_edges,\n        layout="force", #"circular"\n        repulsion=repulsion, gravity=gravity,\n        edge_length=[10,50],\n        is_roam=True, is_focusnode=True, is_draggable=True,\n        label_opts = opts.LabelOpts(is_show=True),\n        tooltip_opts = opts.TooltipOpts(formatter='{b}: <br />{c}'),\n    )\n    .set_series_opts( label_opts = label_opts)\n    .set_global_opts( title_opts = opts.TitleOpts(title=_plot_title_)  )\n    #.render("debug.html")\n    )\n    return Echart_Graph\n\n\n\n# +\n## first pn.bind then pn.pane.Echarts\nEchart_Graph_inter = pn.bind( gen_Network_Graph, \n                               myExplorer.param.sel_reg_localeJ, myExplorer.param.sel_year_locale, myExplorer.param.sel_indicator_main,\n                               wg_slider_repulsion, wg_slider_gravity)\npn_Echart_Graph = pn.Row ( \n    pn.pane.ECharts( Echart_Graph_inter, width=Layout_width[locale]["Echart"], height=850, theme="dark"),\n                           pn_sidebar )  # pn_sidebar extra\n\n#pn_Echart_Graph\n# -\n\n# ### 2. TopN Trendlines\n\n# +\n# mainly for TopN Trendlines\n# graph features\nline_dashes = hv.Cycle(["solid", "dashed", "dotted"]) \nmarkers =     hv.Cycle(['triangle_pin', 'd', "plus", "star"]) \nyear_all_here = [x for x in year_all[locale] if len(x)==4]\nyear_all_here_int = [int(x) for x in year_all[locale] if len(x)==4]\nxlim_year = (min(year_all_here_int)-.5, max(year_all_here_int)+.5)\n\ndef gen_Trendlines_TopN_Nodes (r, indicator, TopN, xlim = xlim_year, year_all_here=year_all_here, line_dashes=line_dashes, markers=markers):\n    FigXlabel = d_trans[locale]['year']\n    FigYlabel = ''# TBA '{_indicator_unit_}'\n    \n    dfs = myExplorer.get_df(r=r,y=year_all_here,i=indicator,NorE = "N")\n    dfs.year = dfs.year.astype(int)\n    dfsr = dfs.groupby("Node").agg({'value':'mean'}).sort_values('value', ascending=False).head(TopN)\n    \n    TopN_Nodes = dfsr.index.tolist()\n    Figlabel  = UI_label[locale]["fTopN_Trendlines_Figlabel"].format(TopN=TopN, TopN_Nodes=", ".join(TopN_Nodes))\n    #print (Figlabel)\n    # Bokeh holoviews\n    obj_curve  = [dfs.query('Node == @key').sort_values (["year","value"], ascending=(True, False))\\\n                     .hvplot(x='year', y="value", kind="line", label = key )                                \n                                      for key in TopN_Nodes ]\n    obj_scatter = [dfs.query('Node == @key').sort_values (["year","value"], ascending=(True, False))\\\n                     .hvplot(x='year', y="value", kind="scatter", label = key, hover_cols=['year','value','Node'] )                                \n                                      for key in TopN_Nodes ]\n    hvo = hv.Overlay( (hv.Overlay(obj_curve) * hv.Overlay(obj_scatter)) )\\\n        .options({\n                'Curve':   { 'line_dash': line_dashes } ,\n                'Scatter': { "marker": markers,  "size": 10 },\n        })\\\n        .opts( height=420, width=Layout_width[locale]["OverlayMain"],\n               title = Figlabel, ylabel = FigYlabel, xlabel = FigXlabel,\n               background_fill_color = None,\n               legend_position='right', legend_cols=1,\n               xlim=xlim,\n               fontsize=16)\n    return hvo\n\n\n# +\n## Getting Interactive Graph and Putting it in the Panel\nTrendlines_inter = pn.bind (gen_Trendlines_TopN_Nodes, r=myExplorer.param.sel_reg_localeJ, indicator=myExplorer.param.sel_indicator_tertiary, \n                            TopN=7)# myExplorer.param.sel_TopN)\n\n## Layout: Use panel container #widget_reg_autocomplete\npn_TopN_Trendlines = pn.Column ( pn.Row( widget_reg_select, widget_indicator_tertiary_sel),\n                                pn.Column( Trendlines_inter, width=Layout_width[locale]["OverlayMain"], height=420) )#                         )\npn_TopN_Trendlines                                 #pn.Row( widget_TopN_slider),\n\n# -\n\n# ### 3. TopN Sankey\n\ndef gen_Sankey_TopN_Nodes (reg, y, TopN):\n    GdfE = myExplorer.get_df ( r=reg, y=y, NorE = "E")    \n    TopN_Edges = GdfE [ GdfE.Input != GdfE.Output ]  # Input != Output query not working for Categorical\n    TopN_Edges = TopN_Edges.sort_values('value', ascending=False).head(TopN)\n\n    TopN_Edges = process_Edges_reversed(TopN_Edges) # for Sankey one way flow\n    TopN_Nodes_list = list(set(TopN_Edges.Input.unique().tolist() + TopN_Edges.Output.unique().tolist()))\n    TopN_Nodes_list\n    \n    Sankey_nodes = [ {'name':k} for k in TopN_Nodes_list ]\n    Sankey_edges = [ {'source':row['Input'], 'target':row["Output"], 'value':row["value"]} \n                       for ind, row in TopN_Edges.reset_index().iterrows() ]  \n\n    label_opts = opts.LabelOpts (font_size=16, rotate=0)\n    Figlabel  = UI_label[locale]["fTopN_Sankey_Figlabel"].format(reg=reg, y=y, TopN=TopN)\n    Echart_Sankey_inter = ( Sankey().add(\n        series_name='',\n        nodes=Sankey_nodes,\n        links=Sankey_edges,\n        itemstyle_opts=opts.ItemStyleOpts(border_width=1, border_color="#aaa"),\n        linestyle_opt=opts.LineStyleOpts(color="source", curve=0.5, opacity=0.5),\n        tooltip_opts=opts.TooltipOpts(trigger_on="mousemove"),\n        )\n        .set_series_opts( label_opts = label_opts)\n        .set_global_opts(title_opts=opts.TitleOpts(title=Figlabel))\n        #.render("sankey_test.html")\n    )\n    #return (TopN_Edges)\n    return (Echart_Sankey_inter)\n\n\n# +\n## Getting Interactive Graph and Putting it in the Panel\nSankey_inter = pn.bind (gen_Sankey_TopN_Nodes,\n                          myExplorer.param.sel_reg_localeJ, myExplorer.param.sel_year_locale, 7 )#myExplorer.param.sel_TopN)\n\n## Layout: Use panel container #  widget_reg_autocomplete,\npn_TopN_Sankey = pn.Column ( pn.Row( widget_reg_select, widget_year_slider),  \n                             pn.pane.ECharts( Sankey_inter, width=Layout_width[locale]["OverlayMain"] ) \n                           ) \n                             \n# pn_TopN_Sankey                                  #pn.Row( widget_year_slider, widget_TopN_slider),\n# -\n\n# ## Panel Integration\n\n# +\n### pn_tabs_primary\npn_tabs_primary = pn.Tabs(\n    (UI_label[locale]["Node"], pn_Node),\n    (UI_label[locale]["Edge"], pn_Edge),\n    (UI_label[locale]["TopN_Trendlines"], pn_TopN_Trendlines),\n    (UI_label[locale]["TopN_Sankey"], pn_TopN_Sankey),\n    stylesheets=[raw_css_custom_tabs],\n)  # CSS raw_css_custom_tabs used\n\n### pn_sidebar\n#pn_tabs_primary\n\n# +\n### Tempalte_Param with pn_sidebar, pn_Echart_Graph, pn_tabs_primary\n#### PNtemplate Constructed using  pn.template.FastGridTemplate  \nDarkTheme = pn.theme.base.DarkTheme\nif "zh" in locale:\n    PNtemplate = pn.template.FastGridTemplate( theme=DarkTheme, sidebar = pn_sidebar, \n        font_url = 'https://fonts.loli.net/css?family=Open+Sans', **template_param)\nelse:\n    PNtemplate = pn.template.FastGridTemplate( theme=DarkTheme, sidebar = pn_sidebar,  **template_param)\n\nPNtemplate.main [0:5,0:12] = pn_Echart_Graph\nPNtemplate.main [5:12,0:12] = pn_tabs_primary\n# -\n\nPNtemplate.servable() #show()\n\n# * -----\u5e94\u7528\u7ed3\u675f-----\n\n\nawait write_doc()
  `

  try {
    const [docs_json, render_items, root_ids] = await self.pyodide.runPythonAsync(code)
    self.postMessage({
      type: 'render',
      docs_json: docs_json,
      render_items: render_items,
      root_ids: root_ids
    })
  } catch(e) {
    const traceback = `${e}`
    const tblines = traceback.split('\n')
    self.postMessage({
      type: 'status',
      msg: tblines[tblines.length-2]
    });
    throw e
  }
}

self.onmessage = async (event) => {
  const msg = event.data
  if (msg.type === 'rendered') {
    self.pyodide.runPythonAsync(`
    from panel.io.state import state
    from panel.io.pyodide import _link_docs_worker

    _link_docs_worker(state.curdoc, sendPatch, setter='js')
    `)
  } else if (msg.type === 'patch') {
    self.pyodide.globals.set('patch', msg.patch)
    self.pyodide.runPythonAsync(`
    from panel.io.pyodide import _convert_json_patch
    state.curdoc.apply_json_patch(_convert_json_patch(patch), setter='js')
    `)
    self.postMessage({type: 'idle'})
  } else if (msg.type === 'location') {
    self.pyodide.globals.set('location', msg.location)
    self.pyodide.runPythonAsync(`
    import json
    from panel.io.state import state
    from panel.util import edit_readonly
    if state.location:
        loc_data = json.loads(location)
        with edit_readonly(state.location):
            state.location.param.update({
                k: v for k, v in loc_data.items() if k in state.location.param
            })
    `)
  }
}

startApplication()