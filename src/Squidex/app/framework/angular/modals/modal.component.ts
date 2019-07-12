/*
 * Squidex Headless CMS
 *
 * @license
 * Copyright (c) Squidex UG (haftungsbeschränkt). All rights reserved.
 */

import { ConnectionPositionPair, HorizontalConnectionPos, Overlay, OverlayConfig, OverlayRef, PositionStrategy, VerticalConnectionPos } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';

import {
    DialogModel,
    ModalModel,
    Types
} from '@app/framework/internal';

export type XPosition =
    'center' |
    'left-out' |
    'left' |
    'right-out' |
    'right';

export type YPosition =
    'bottom-out' |
    'bottom' |
    'center' |
    'top-out' |
    'top';

@Component({
    selector: 'sqx-modal',
    template: `
        <ng-template #templatePortalContent>
            <div (click)="onClick()">
            <ng-content></ng-content>
            </div>
        </ng-template>
    `
})
export class ModalComponent implements AfterViewInit, OnChanges, OnDestroy {
    private modalSubscription: Subscription | null = null;
    private templatePortal: TemplatePortal<any>;
    private overlayRef: OverlayRef | null;
    private isOpen: boolean;

    @Input()
    public target: Element;

    @Input()
    public model: DialogModel | ModalModel | any;

    @Input()
    public xPosition: XPosition = 'right';

    @Input()
    public yPosition: YPosition = 'bottom-out';

    @Input()
    public outside = false;

    @Input()
    public xOffset = 2;

    @Input()
    public yOffset = 2;

    @Input()
    public backdrop = true;

    @Input()
    public closeAuto = true;

    @Input()
    public closeAlways = false;

    @ViewChild('templatePortalContent', { static: false })
    public templatePortalContent: TemplateRef<any>;

    constructor(
        private readonly overlay: Overlay,
        private readonly viewContainerRef: ViewContainerRef
    ) {
    }

    public ngAfterViewInit() {
        this.templatePortal = new TemplatePortal(this.templatePortalContent, this.viewContainerRef);

        this.update(this.isOpen);
    }

    public ngOnDestroy() {
        if (this.isModalModel()) {
            this.model.hide();
        }

        this.unsubscribeToModal();
    }

    public ngOnChanges(changes: SimpleChanges) {
        if (!changes['model']) {
            return;
        }

        this.unsubscribeToModal();

        if (this.isModalModel()) {
            this.modalSubscription =
                this.model.isOpen.subscribe((isOpen: boolean) => {
                    this.update(isOpen);
                });
        } else {
            this.update(!!this.model);
        }
    }

    public onClick() {
        if (this.closeAlways) {
            this.model.hide();
        }
    }

    private update(isOpen: boolean) {
        this.isOpen = isOpen;

        if (!this.templatePortal) {
            return;
        }

        if (isOpen) {
            if (!this.overlayRef) {
                const config: OverlayConfig = {};

                if (this.target) {
                    config.positionStrategy =
                        this.overlay.position()
                            .flexibleConnectedTo(new ElementRef<Element>(this.target))
                            .withLockedPosition()
                            .withPositions(this.getPositions());
                    config.scrollStrategy = this.overlay.scrollStrategies.close();
                }

                config.hasBackdrop = this.backdrop;

                if (!Types.is(this.model, DialogModel)) {
                    config.backdropClass = 'cdk-overlay-transparent-backdrop';
                }

                this.overlayRef = this.overlay.create(config);
                this.overlayRef.attach(this.templatePortal);

                if (this.closeAuto) {
                    this.overlayRef.backdropClick().subscribe(() => {
                        if (this.isModalModel()) {
                            this.model.hide();
                        }
                    });
                }
            }
        } else {
            if (this.overlayRef) {
                this.overlayRef.dispose();
                this.overlayRef = null;
            }
        }
    }

    private unsubscribeToModal() {
        if (this.modalSubscription) {
            this.modalSubscription.unsubscribe();
            this.modalSubscription = null;
        }
    }

    private getPositions(): ConnectionPositionPair[] {
        const xd = getXPosition(this.xPosition, this.xOffset);
        const xf = getXFallback(this.xPosition, this.xOffset);

        const yd = getYPosition(this.yPosition, this.yOffset);
        const yf = getYFallback(this.yPosition, this.yOffset);

        return [
            {
                originX: xd.origin,
                originY: yd.origin,
                overlayX: xd.overlay,
                overlayY: yd.overlay,
                offsetX: xd.offset,
                offsetY: xd.offset
            },
            {
                originX: xf.origin,
                originY: yd.origin,
                overlayX: xf.overlay,
                overlayY: yd.overlay,
                offsetX: xf.offset,
                offsetY: xd.offset
            },
            {
                originX: xd.origin,
                originY: yf.origin,
                overlayX: xd.overlay,
                overlayY: yf.overlay,
                offsetX: xd.offset,
                offsetY: xf.offset
            },
            {
                originX: xf.origin,
                originY: yf.origin,
                overlayX: xf.overlay,
                overlayY: yf.overlay,
                offsetX: xf.offset,
                offsetY: xf.offset
            }
        ];
    }

    private isModalModel() {
        return Types.is(this.model, DialogModel) || Types.is(this.model, ModalModel);
    }
}

declare type XValues = { origin: HorizontalConnectionPos, overlay: HorizontalConnectionPos, offset: number };

function getXFallback(position: XPosition, offset: number): XValues {
    const x = getXPosition(position, offset);

    return { origin: x.overlay, overlay: x.origin, offset: -x.offset };
}

function getYFallback(position: YPosition, offset: number): YValues {
    const y = getYPosition(position, offset);

    return { origin: y.overlay, overlay: y.origin, offset: -y.offset };
}

function getXPosition(position: XPosition, offset: number): XValues {
    switch (position) {
        case 'left':
            return { origin: 'start', overlay: 'start', offset: -offset };
        case 'left-out':
            return { origin: 'start', overlay: 'end', offset: -offset };
        case 'right':
            return { origin: 'end', overlay: 'end', offset };
        case 'right-out':
            return { origin: 'end', overlay: 'start', offset };
        default:
            return { origin: 'center', overlay: 'center', offset: 0 };
    }
}

declare type YValues = { origin: VerticalConnectionPos, overlay: VerticalConnectionPos, offset: number };

function getYPosition(position: YPosition, offset: number): YValues {
    switch (position) {
        case 'top':
            return { origin: 'top', overlay: 'top', offset: -offset };
        case 'top-out':
            return { origin: 'top', overlay: 'bottom', offset: -offset };
        case 'bottom':
            return { origin: 'bottom', overlay: 'bottom', offset };
        case 'bottom-out':
            return { origin: 'bottom', overlay: 'top', offset };
        default:
            return { origin: 'center', overlay: 'center', offset: 0 };
    }
}

class CoverPositionStratgy implements PositionStrategy  {
    private _overlayRef: OverlayRef;

    public attach(overlayRef: OverlayRef): void {
        this._overlayRef = overlayRef;
    }

    public apply(): void {
        if (!this._overlayRef.hasAttached()) {
            return;
        }
    }

    public dispose() {
        // NOOP
    }
}