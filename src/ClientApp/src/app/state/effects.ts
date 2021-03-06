import { Injectable } from '@angular/core';
import { LoadDataDoneAction, LoadErrorAction, ActionTypes, LoadLocationDone, LoadLocationError, LoadLocations } from './actions';
import { Observable, of, forkJoin, } from 'rxjs';
import { mergeMap, map, catchError, withLatestFrom, switchMap } from 'rxjs/operators';
import { Action, Store } from '@ngrx/store';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { DataService } from '../services/data.service';
import { HereAddressService } from '../services/here-address.service';

import { ApplicationState } from './reducers';

@Injectable({ providedIn: 'root' })
export class ApplicationEffects {

    constructor(private dataService: DataService,
        private addressService: HereAddressService,
        private actions$: Actions,
        private store$: Store<ApplicationState>) { }

    @Effect()
    loadData$: Observable<Action> = this.actions$.pipe(
        ofType(ActionTypes.LOAD_DATA),
        mergeMap(() =>
            this.dataService.getData().pipe(
                map(data => (new LoadDataDoneAction(data))),
                catchError(err => of(new LoadErrorAction(err)))
            )
        )
    );

    @Effect()
    getUserTypeUserPermissions$: Observable<Action> = this.actions$.pipe(
        ofType<LoadLocations>(ActionTypes.LOAD_LOCATIONS),

        switchMap((action) => this.addressService.getLocationDetails(action.locationId)),
        switchMap((userLocation) => {
            const { displayPosition } = userLocation.response.view[0].result[0].location;
            return this.dataService.getPollingStations(displayPosition.latitude, displayPosition.longitude).pipe(map(result => {
                return {
                    userLocation: userLocation.response.view[0].result[0].location,
                    pollingStations: result
                }
            }));
        }),
        map((res) => {
            return new LoadLocationDone(res.userLocation, res.pollingStations);
        }),
        catchError(error => of(new LoadLocationError(error)))
    );
}
