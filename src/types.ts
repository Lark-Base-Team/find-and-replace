import { IFieldMeta } from "@lark-base-open/js-sdk";

export enum ModeValue {
    simple = 'simple',
    reg = 'reg',
    json = 'json',
}


export interface ISearchStatus {
    [fieldId: string]: {
        total: number,
        remain: number,
        searched: number,
        fieldMeta: IFieldMeta,
        hasMore?: boolean
    }
}

export interface ISearchStatusAction {
    total: number,
    remain: number,
    searched: number,
    fieldMeta: IFieldMeta,
    hasMore?: boolean
}

export const reducer = (state: ISearchStatus, searchStatus: ISearchStatusAction) => {
    state[searchStatus.fieldMeta.id] = {
        total: searchStatus.total,
        remain: searchStatus.remain,
        searched: searchStatus.searched,
        fieldMeta: searchStatus.fieldMeta,
        hasMore: searchStatus.hasMore,
    };
    return { ...state };
};


export interface ISetRecordsStatus {
    [fieldId: string]: {
        total: number,
        remain: number,
        successed: number,
        fieldMeta: IFieldMeta,
        failed: number,
        hasMore?: boolean
    }
}

export interface ISetRecordsStatusAction {
    total: number,
    remain: number,
    successed: number,
    fieldMeta: IFieldMeta,
    failed: number,
    hasMore?: boolean
}

export const setRecordsReducer = (state: ISetRecordsStatus, setStatus: ISetRecordsStatusAction) => {
    state[setStatus.fieldMeta.id] = {
        total: setStatus.total,
        remain: setStatus.remain,
        successed: setStatus.successed,
        fieldMeta: setStatus.fieldMeta,
        hasMore: setStatus.hasMore,
        failed: setStatus.failed,
    };
    return { ...state };
};
