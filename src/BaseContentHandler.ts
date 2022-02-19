import { IContentHandler } from "./IContentHandler";
import { IUVOptions } from "./UniversalViewer";

export default class BaseContentHandler<IUVData>
  implements IContentHandler<IUVData> {
  protected _el: HTMLElement;
  private _eventListeners: any;

  constructor(public options: IUVOptions) {
    console.log("create YouTubeContentHandler");
    this._el = this.options.target;
  }

  public set(data: IUVData): void {}

  public on(name: string, callback: Function, ctx: any): void {
    var e = this._eventListeners || (this._eventListeners = {});

    (e[name] || (e[name] = [])).push({
      fn: callback,
      ctx: ctx,
    });
  }

  public fire(name: string, ...args: any[]): void {
    var data = [].slice.call(arguments, 1);
    var evtArr = (
      (this._eventListeners || (this._eventListeners = {}))[name] || []
    ).slice();
    var i = 0;
    var len = evtArr.length;

    for (i; i < len; i++) {
      evtArr[i].fn.apply(evtArr[i].ctx, data);
    }
  }

  public exitFullScreen(): void {}

  public resize(): void {}

  public dispose(): void {
    this._el.innerHTML = "";
  }
}
