"use strict";
import { select, Selection } from "d3-selection";
import { formatPrefix } from "d3-format";

/**/
import powerbi from "powerbi-visuals-api";

/**/
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import IViewport = powerbi.IViewport;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

/**/
import { VisualSettings } from "./settings/settings";

/**/
import { VisualViewModel, CategoryViewModel } from "./model/visualViewModel";
import { visualTransform } from "./utilities/visualTransform";

/**/
import DataViewMatrix = powerbi.DataViewMatrix;
import DataViewMatrixNode = powerbi.DataViewMatrixNode;

/**/
export class Visual implements IVisual {
  private target: d3.Selection<any, any, any, any>;
  private table: d3.Selection<any, any, any, any>;
  private tHead: d3.Selection<any, any, any, any>;
  private tBody: d3.Selection<any, any, any, any>;
  private settings: VisualSettings;

  constructor(options: VisualConstructorOptions) {
    let target: d3.Selection<any, any, any, any> = (this.target = select(
      options.element
    ));
  }

  public update(options: VisualUpdateOptions): void {
    this.updateInternal(options, visualTransform(options.dataViews));
  }

  public updateInternal(
    options: VisualUpdateOptions,
    viewModel: VisualViewModel
  ): void {

    var rootElement: Selection<HTMLDivElement, DataViewMatrixNode, any, any>;

    let matrix: DataViewMatrix = options.dataViews[0].matrix;
    if (!viewModel || !matrix) {
      return;
    }

    console.log("updateInternal/DATA: matrix:", matrix);

    this.settings = Visual.parseSettings(options.dataViews[0]);
    let root: DataViewMatrixNode = matrix.rows.root;
    console.log("updateInternal/DATA: root:", root);

    // create root node
    this.target.select(".root").remove();

    rootElement = this.target.selectAll("div.root");
    console.log("updateInternal/HTML: rootElement", rootElement);

    let rootElementData = rootElement.data([root]);
    console.log("updateInternal/HTML: rootElementData", rootElementData);

    rootElementData.exit().remove();

    let rootElementMerged = rootElementData
      .enter()
      .append("div")
      .merge(rootElement);
    rootElementMerged.classed("root", true);

    this.treeWalker(this.target.select("div.root"), root.children);
  }

  private treeWalker(parent, data, level=0) {
    console.log(`treeWalker: level=${level} parent=`, parent, ` data=`, data)

    let childrenElements = parent.selectAll("div.child");
    console.log("treeWalker/HTML: childrenElements", childrenElements);

    let childrenElementsData = childrenElements.data(data);
    console.log("treeWalker/HTML: childrenElementsData", childrenElementsData);

    childrenElementsData.exit().remove();

    let childrenElementsMerged = childrenElementsData
      .enter()
      .append("div")
      .merge(childrenElements);
    childrenElementsMerged.classed("child", true);
    childrenElementsMerged.style(
      "margin-left",
      (data) => `${data.level * 20}px`
    );

    childrenElementsMerged.append("text").text((data) => data.value);

    childrenElementsMerged.nodes().forEach((node, index) => {
      if (data[index].children) {
        // draw child
        this.treeWalker(select(node), data[index].children, level+1);
      } else {
        // draw values
        let valuesElementsData = select(node)
          .selectAll("text.values")
          .data(Object.values(data[index].values));

        select(node).append("text").classed("values", true).text(" Measures: ");

        valuesElementsData
          .enter()
          .append("text")
          .classed("values", true)
          .text((data) => ` ${(<any>data).value} #|`);

        console.log("treeWalker/HTML: valuesElementsData", valuesElementsData);
      }
    });
  }

  private static parseSettings(dataView: DataView): VisualSettings {
    return VisualSettings.parse(dataView) as VisualSettings;
  }

  public enumerateObjectInstances(
    options: EnumerateVisualObjectInstancesOptions
  ): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
    return VisualSettings.enumerateObjectInstances(
      this.settings || VisualSettings.getDefault(),
      options
    );
  }
}
