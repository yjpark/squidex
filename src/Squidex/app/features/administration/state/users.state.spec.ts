/*
 * Squidex Headless CMS
 *
 * @license
 * Copyright (c) Squidex UG (haftungsbeschränkt). All rights reserved.
 */

import { Observable } from 'rxjs';
import { IMock, It, Mock, Times } from 'typemoq';

import { AuthService, DialogService } from '@app/shared';

import { UsersState } from './users.state';

import {
    CreateUserDto,
    UserDto,
    UpdateUserDto,
    UsersDto,
    UsersService
 } from './../services/users.service';

describe('UsersState', () => {
    const oldUsers = [
        new UserDto('id1', 'mail1@mail.de', 'name1', false),
        new UserDto('id2', 'mail2@mail.de', 'name2', true)
    ];

    const newUser = new UserDto('id3', 'mail3@mail.de', 'name3', false);

    let authService: IMock<AuthService>;
    let dialogService: IMock<DialogService>;
    let usersService: IMock<UsersService>;
    let usersState: UsersState;

    beforeEach(() => {
        authService = Mock.ofType<AuthService>();

        authService.setup(x => x.user)
            .returns(() => <any>{ id: 'id2' });

        dialogService = Mock.ofType<DialogService>();

        usersService = Mock.ofType<UsersService>();

        usersService.setup(x => x.getUsers(10, 0, undefined))
            .returns(() => Observable.of(new UsersDto(200, oldUsers)));

        usersState = new UsersState(authService.object, dialogService.object, usersService.object);
        usersState.loadUsers().subscribe();
    });

    it('should load apps', () => {
        expect(usersState.snapshot.users.values).toEqual(oldUsers);
        expect(usersState.snapshot.usersPager.numberOfItems).toEqual(200);

        usersService.verifyAll();
    });

    it('should raise notification on load when notify is true', () => {
        usersState.loadUsers(true).subscribe();

        dialogService.verify(x => x.notifyInfo(It.isAnyString()), Times.once());
    });

    it('should not load user when already loaded', () => {
        let selectedUser: UserDto;

        usersState.selectUser('id1').subscribe(x => {
            selectedUser = x!;
        });

        expect(selectedUser!).toEqual(oldUsers[0]);
        expect(usersState.snapshot.selectedUser).toBe(oldUsers[0]);

        usersService.verify(x => x.getUser(It.isAnyString()), Times.never());
    });

    it('should mark as current user when selected user equals to profile', () => {
        usersState.selectUser('id2').subscribe();

        expect(usersState.snapshot.isCurrentUser).toBeTruthy();
    });

    it('should load user when not loaded', () => {
        usersService.setup(x => x.getUser('id3'))
            .returns(() => Observable.of(newUser));

        let selectedUser: UserDto;

        usersState.selectUser('id3').subscribe(x => {
            selectedUser = x!;
        });

        expect(selectedUser!).toEqual(newUser);
        expect(usersState.snapshot.selectedUser).toBe(newUser);
    });

    it('should return null when unselecting user', () => {
        let selectedUser: UserDto;

        usersState.selectUser(null).subscribe(x => {
            selectedUser = x!;
        });

        expect(selectedUser!).toBeNull();
        expect(usersState.snapshot.selectedUser).toBeNull();

        usersService.verify(x => x.getUser(It.isAnyString()), Times.never());
    });

    it('should return null when user to select is not found', () => {
        usersService.setup(x => x.getUser('unknown'))
            .returns(() => Observable.throw({}));

        let selectedUser: UserDto;

        usersState.selectUser('unknown').subscribe(x => {
            selectedUser = x!;
        }).unsubscribe();

        expect(selectedUser!).toBeNull();
        expect(usersState.snapshot.selectedUser).toBeNull();
    });

    it('should mark user as locked', () => {
        usersService.setup(x => x.lockUser('id1'))
            .returns(() => Observable.of({}));

        usersState.selectUser('id1').subscribe();
        usersState.lockUser(oldUsers[0]).subscribe();

        expect(usersState.snapshot.users.at(0).isLocked).toBeTruthy();
        expect(usersState.snapshot.selectedUser!.isLocked).toBeTruthy();
    });

    it('should raise notification when locking failed', () => {
        usersService.setup(x => x.lockUser('id1'))
            .returns(() => Observable.throw({}));

        usersState.lockUser(oldUsers[0]).onErrorResumeNext().subscribe();

        dialogService.verify(x => x.notifyError(It.isAny()), Times.once());
    });

    it('should unmark user as locked', () => {
        usersService.setup(x => x.unlockUser('id2'))
            .returns(() => Observable.of({}));

        usersState.selectUser('id2').subscribe();
        usersState.unlockUser(oldUsers[1]).subscribe();

        expect(usersState.snapshot.users.at(1).isLocked).toBeFalsy();
        expect(usersState.snapshot.selectedUser!.isLocked).toBeFalsy();
    });

    it('should raise notification when unlocking failed', () => {
        usersService.setup(x => x.unlockUser('id2'))
            .returns(() => Observable.throw({}));

        usersState.unlockUser(oldUsers[1]).onErrorResumeNext().subscribe();

        dialogService.verify(x => x.notifyError(It.isAny()), Times.once());
    });

    it('should update user on update', () => {
        const request = new UpdateUserDto('new@mail.com', 'New');

        usersService.setup(x => x.putUser('id1', request))
            .returns(() => Observable.of({}));

        usersState.selectUser('id1').subscribe();
        usersState.updateUser(oldUsers[0], request).subscribe();

        expect(usersState.snapshot.users.at(0).email).toEqual('new@mail.com');
        expect(usersState.snapshot.users.at(0).displayName).toEqual('New');
        expect(usersState.snapshot.selectedUser!.email).toEqual('new@mail.com');
        expect(usersState.snapshot.selectedUser!.displayName).toEqual('New');
    });

    it('should not raise notification when updating failed', () => {
        const request = new UpdateUserDto('new@mail.com', 'New');

        usersService.setup(x => x.putUser('id1', request))
            .returns(() => Observable.throw({}));

        usersState.updateUser(oldUsers[0], request).onErrorResumeNext().subscribe();

        dialogService.verify(x => x.notifyError(It.isAny()), Times.never());
    });

    it('should add user to state when created', () => {
        const request = new CreateUserDto(newUser.email, newUser.displayName, 'password');

        usersService.setup(x => x.postUser(request))
            .returns(() => Observable.of(newUser));

        usersState.createUser(request).subscribe();

        expect(usersState.snapshot.users.at(0)).toBe(newUser);
        expect(usersState.snapshot.usersPager.numberOfItems).toBe(201);
    });

    it('should not raise notification when creating failed', () => {
        const request = new CreateUserDto(newUser.email, newUser.displayName, 'password');

        usersService.setup(x => x.postUser(request))
            .returns(() => Observable.throw({}));

        usersState.createUser(request).onErrorResumeNext().subscribe();

        dialogService.verify(x => x.notifyError(It.isAny()), Times.never());
    });

    it('should load next page and prev page when paging', () => {
        usersService.setup(x => x.getUsers(10, 10, undefined))
            .returns(() => Observable.of(new UsersDto(200, [])));

        usersState.goNext().subscribe();
        usersState.goPrev().subscribe();

        usersService.verify(x => x.getUsers(10, 10, undefined), Times.once());
        usersService.verify(x => x.getUsers(10,  0, undefined), Times.exactly(2));
    });

    it('should load with query when searching', () => {
        usersService.setup(x => x.getUsers(10, 0, 'my-query'))
            .returns(() => Observable.of(new UsersDto(0, [])));

        usersState.search('my-query').subscribe();

        expect(usersState.snapshot.usersQuery).toEqual('my-query');

        usersService.verify(x => x.getUsers(10, 0, 'my-query'), Times.once());
    });
});