import baseExtension = require("../../modules/uv-shared-module/baseExtension");
import shell = require("../../modules/uv-shared-module/shell");
import utils = require("../../utils");
import dialogue = require("../../modules/uv-shared-module/dialogue");
import settings = require("../../modules/uv-dialogues-module/settingsDialogue");
import ISeadragonExtension = require("./iSeadragonExtension");
import ISeadragonProvider = require("./iSeadragonProvider");
import DownloadOption = require("./DownloadOption");
import ServiceProfile = require("../../modules/uv-shared-module/ServiceProfile");
import RenderingFormat = require("../../modules/uv-shared-module/RenderingFormat");

export class DownloadDialogue extends dialogue.Dialogue {

    $title: JQuery;
    $noneAvailable: JQuery;
    $settingsButton: JQuery;
    $pagingNote: JQuery;
    $downloadOptions: JQuery;
    $currentViewAsJpgButton: JQuery;
    $wholeImageHighResButton: JQuery;
    $wholeImageLowResAsJpgButton: JQuery;
    $buttonsContainer: JQuery;
    $downloadButton: JQuery;
    renderingUrls: string[];
    renderingUrlsCount: number;

    static SHOW_DOWNLOAD_DIALOGUE: string = 'onShowDownloadDialogue';
    static HIDE_DOWNLOAD_DIALOGUE: string = 'onHideDownloadDialogue';
    static DOWNLOAD: string = 'onDownload';

    constructor($element: JQuery) {
        super($element);
    }

    create(): void {

        this.setConfig('downloadDialogue');

        super.create();

        $.subscribe(DownloadDialogue.SHOW_DOWNLOAD_DIALOGUE, (e, params) => {
            this.open();
        });

        $.subscribe(DownloadDialogue.HIDE_DOWNLOAD_DIALOGUE, (e) => {
            this.close();
        });

        // create ui.
        this.$title = $('<h1>' + this.content.title + '</h1>');
        this.$content.append(this.$title);

        this.$noneAvailable = $('<div class="noneAvailable">' + this.content.noneAvailable + '</div>');
        this.$content.append(this.$noneAvailable);

        this.$settingsButton = $('<a class="settings" href="#">' + this.content.editSettings + '</a>');
        this.$pagingNote = $('<div class="pagingNote">' + this.content.pagingNote + ' </div>');
        this.$pagingNote.append(this.$settingsButton);
        this.$content.append(this.$pagingNote);

        this.$downloadOptions = $('<ol class="options"></ol>');
        this.$content.append(this.$downloadOptions);

        this.$currentViewAsJpgButton = $('<li><input id="' + DownloadOption.currentViewAsJpg.toString() + '" type="radio" name="downloadOptions" /><label for="' + DownloadOption.currentViewAsJpg.toString() + '">' + this.content.currentViewAsJpg + '</label></li>');
        this.$downloadOptions.append(this.$currentViewAsJpgButton);
        this.$currentViewAsJpgButton.hide();

        this.$wholeImageHighResButton = $('<li><input id="' + DownloadOption.wholeImageHighRes.toString() + '" type="radio" name="downloadOptions" /><label id="' + DownloadOption.wholeImageHighRes.toString() + 'label" for="' + DownloadOption.wholeImageHighRes.toString() + '"></label></li>');
        this.$downloadOptions.append(this.$wholeImageHighResButton);
        this.$wholeImageHighResButton.hide();

        this.$wholeImageLowResAsJpgButton = $('<li><input id="' + DownloadOption.wholeImageLowResAsJpg.toString() + '" type="radio" name="downloadOptions" /><label for="' + DownloadOption.wholeImageLowResAsJpg.toString() + '">' + this.content.wholeImageLowResAsJpg + '</label></li>');
        this.$downloadOptions.append(this.$wholeImageLowResAsJpgButton);
        this.$wholeImageLowResAsJpgButton.hide();

        this.$buttonsContainer = $('<div class="buttons"></div>');
        this.$content.append(this.$buttonsContainer);

        this.$downloadButton = $('<a class="btn btn-primary" href="#">' + this.content.download + '</a>');
        this.$buttonsContainer.append(this.$downloadButton);

        var that = this;

        this.$downloadButton.on('click', (e) => {
            e.preventDefault();

            var selectedOption = that.getSelectedOption();

            var id: string = selectedOption.attr('id');
            var canvas = this.provider.getCurrentCanvas();

            if (this.renderingUrls[id]) {
                window.open(this.renderingUrls[id]);
            } else {
                switch (id){
                    case DownloadOption.currentViewAsJpg.toString():
                        var viewer = (<ISeadragonExtension>that.extension).getViewer();
                        window.open((<ISeadragonProvider>that.provider).getCroppedImageUri(canvas, viewer, true));
                        break;
                    case DownloadOption.wholeImageHighRes.toString():
                        window.open(this.getOriginalImageForCurrentCanvas());
                        break;
                    case DownloadOption.wholeImageLowResAsJpg.toString():
                        window.open((<ISeadragonProvider>that.provider).getConfinedImageUri(canvas, that.options.confinedImageSize));
                        break;
                }
            }

            $.publish(DownloadDialogue.DOWNLOAD, [id]);

            this.close();
        });

        this.$settingsButton.onPressed(() => {
            this.close();
            $.publish(settings.SettingsDialogue.SHOW_SETTINGS_DIALOGUE);
        });

        // hide
        this.$element.hide();
    }

    open() {
        super.open();

        if (this.isDownloadOptionAvailable(DownloadOption.currentViewAsJpg)) {
            this.$currentViewAsJpgButton.show();
        } else {
            this.$currentViewAsJpgButton.hide();
        }

        if (this.isDownloadOptionAvailable(DownloadOption.wholeImageHighRes)) {
            var mime = this.getMimeTypeForCurrentCanvas();
            var label = String.prototype.format(this.content.wholeImageHighRes, this.simplifyMimeType(mime));
            $('#' + DownloadOption.wholeImageHighRes.toString() + 'label').text(label);
            this.$wholeImageHighResButton.show();
        } else {
            this.$wholeImageHighResButton.hide();
        }

        if (this.isDownloadOptionAvailable(DownloadOption.wholeImageLowResAsJpg)) {
            this.$wholeImageLowResAsJpgButton.show();
        } else {
            this.$wholeImageLowResAsJpgButton.hide();
        }

        this.resetDynamicDownloadOptions();
        var currentCanvas = this.provider.getCurrentCanvas();
        if (this.isDownloadOptionAvailable(DownloadOption.dynamicImageRenderings)) {
            for (var i = 0; i < currentCanvas.images.length; i++) {
                this.addDownloadOptionsForRenderings(currentCanvas.images[i], this.content.entireFileAsOriginal);
            }
        }
        if (this.isDownloadOptionAvailable(DownloadOption.dynamicCanvasRenderings)) {
            this.addDownloadOptionsForRenderings(currentCanvas, this.content.entireFileAsOriginal);
        }
        if (this.isDownloadOptionAvailable(DownloadOption.dynamicSequenceRenderings)) {
            this.addDownloadOptionsForRenderings(this.provider.sequence, this.content.entireDocument);
        }

        if (!this.$downloadOptions.find('li:visible').length){
            this.$noneAvailable.show();
            this.$downloadButton.hide();
        } else {
            // select first option.
            this.$downloadOptions.find('input:visible:first').prop("checked", true);
            this.$noneAvailable.hide();
            this.$downloadButton.show();
        }

        var settings: ISettings = this.provider.getSettings();
        if (settings.pagingEnabled) {
            this.$pagingNote.show();
        } else {
            this.$pagingNote.hide();
        }

        this.resize();
    }

    resetDynamicDownloadOptions()
    {
        this.renderingUrls = [];
        this.renderingUrlsCount = 0;
        this.$downloadOptions.find('.dynamic').remove();
    }

    simplifyMimeType(mime: string)
    {
        switch (mime) {
        case 'text/plain':
            return 'txt';
        case 'image/jpeg':
            return 'jpg';
        case 'application/msword':
            return 'doc';
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return 'docx';
        default:
            var parts = mime.split('/');
            return parts[parts.length - 1];
        }
    }

    addDownloadOptionsForRenderings(resource: any, defaultLabel: string)
    {
        var renderings = resource.rendering;

        if (!$.isArray(renderings)){
            renderings = [renderings];
        }

        for (var i = 0; i < renderings.length; i++) {
            var rendering = renderings[i];
            if (rendering) {
                var label = this.provider.getLocalisedValue(rendering['label']);
                if (label) {
                    label += " ({0})";
                } else {
                    label = defaultLabel;
                }
                label = String.prototype.format(label, this.simplifyMimeType(rendering.format));
                var currentId = "dynamic_download_" + ++this.renderingUrlsCount;
                this.renderingUrls[currentId] = rendering['@id'];
                var newButton = $('<li class="dynamic"><input id="' + currentId + '" type="radio" name="downloadOptions" /><label for="' + currentId + '">' + label + '</label></li>');
                this.$downloadOptions.append(newButton);
            }
        }
    }

    getSelectedOption() {
        return this.$downloadOptions.find("input:checked");
    }

    getOriginalImageForCurrentCanvas() {
        var canvas = this.provider.getCurrentCanvas();
        if (canvas['images'][0]['resource']['@id']) {
            return canvas['images'][0]['resource']['@id'];
        }
        return false;
    }

    getMimeTypeForCurrentCanvas() {
        var canvas = this.provider.getCurrentCanvas();
        if (canvas['images'][0]['resource']['format']) {
            return canvas['images'][0]['resource']['format'];
        }
        return false;
    }

    isDownloadOptionAvailable(option: DownloadOption): boolean {
        var settings: ISettings = this.provider.getSettings();

        switch (option){
            case DownloadOption.currentViewAsJpg:
            case DownloadOption.dynamicCanvasRenderings:
            case DownloadOption.dynamicImageRenderings:
            case DownloadOption.wholeImageHighRes:
            case DownloadOption.wholeImageLowResAsJpg:
                return settings.pagingEnabled ? false : true;
            default:
                return true;
        }
    }

    resize(): void {

        this.$element.css({
            'top': this.extension.height() - this.$element.outerHeight(true)
        });
    }
}