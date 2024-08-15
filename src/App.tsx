import "./App.css";
import {
  Button,
  Toast,
  Form,
  Checkbox,
  Spin,
  Tooltip,
} from "@douyinfe/semi-ui";
import { FormApi } from "@douyinfe/semi-ui/lib/es/form";
import { IFieldMeta, FieldType, IField, ITable, ITableMeta, bitable } from "@lark-base-open/js-sdk";
import { useEffect, useRef, useState, useMemo, useReducer } from "react";
import { FiledTypesDesc, replaceCells, ReplaceInfos, SupportField, createRegexFromString, ToSetList, replaceAll, ReplaceInfo } from './utils'
import DiffCard from "./components/DiffCard";
import { useTranslation } from 'react-i18next';
import { icons } from './icons'
import { IconHelpCircle } from '@douyinfe/semi-icons';
import { setStep, getStep } from './constant';
import { ModeValue, reducer, setRecordsReducer } from './types'

const regHelp = 'https://feishu.feishu.cn/docx/MZACdD4cGoP8MfxYoVucdaRYnBd'

/** 监听table,所有table的字段变化，然后重新挂载App组件 */
export default function Ap() {
  const [key, setKey] = useState<string | number>(0);
  const [tableList, setTableList] = useState<ITable[]>([]);
  // 绑定过的tableId
  const bindList = useRef<Set<string>>(new Set());

  const refresh = useMemo(
    () => () => {
      const t = new Date().getTime();
      setKey(t);
    },
    []
  );

  useEffect(() => {
    bitable.base.getTableList().then((list) => {
      setTableList(list);
    });
    const deleteOff = bitable.base.onTableDelete(() => {
      setKey(new Date().getTime());
    });
    const addOff = bitable.base.onTableAdd(() => {
      setKey(new Date().getTime());
      bitable.base.getTableList().then((list) => {
        setTableList(list);
      });
    });
    return () => {
      deleteOff();
      addOff();
    };
  }, []);

  useEffect(() => {
    if (tableList.length) {
      tableList.forEach((table) => {
        if (bindList.current.has(table.id)) {
          return;
        }
        table.onFieldAdd(refresh);
        table.onFieldDelete(refresh);
        table.onFieldModify(refresh);
        bindList.current.add(table.id);
      });
    }
  }, [tableList]);

  return <App key={key}></App>;
}

//@ts-ignore
window.bitable = bitable;

const supportFieldType = Object.keys(FiledTypesDesc);



/** 选择所有 (字段/table/view) */
const ALL = "all";

type AllFieldMetaLists = { table: ITable; fieldMetaList: IFieldMeta[]; name: string }[];

function App() {
  const [mode, setMode] = useState<ModeValue>(ModeValue.simple)
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [findBtnLoading, setFindBtnLoading] = useState(false);
  // 得到结果的时间戳，控制每次得到结果的时候重新挂载结果
  const [resultKey, setResultKey] = useState(0);
  // 设置成功的结果的时间戳
  const [latestSuccessResultKey, setlatestSuccessResultKey] = useState<number>();
  // 查找按钮是否禁用
  const [disable, setDisable] = useState(true);
  // 所有查找替换的信息
  const [replaceInfos, setReplaceInfos] = useState<ReplaceInfos | undefined>();
  const [replaceAllLoading, setReplaceAllLoading] = useState(false);
  const [selection, setSelection] = useState<{ table: ITable; tableId: string }>();
  // 成功设置的单元格fieldId;recordId
  const [successed, setSeccessed] = useState<string[]>([]);
  const [tableMetaList, setTableMetaList] = useState<ITableMeta[]>();
  // 所选table下的所有fieldMetalist，暂时只能选一个table，所以长度为最多为1
  const [fieldMetaList, setFieldMetaList] = useState<AllFieldMetaLists>();
  const formApi = useRef<FormApi>();
  const [simpleModeSearchValue, setSimpleModeSearchValue] = useState('');
  const [searchStatus, setSearchStatus] = useReducer(reducer, {});
  const [setRecordsSuccessedStatus, setSetRecordsSuccessedStatus] = useReducer(setRecordsReducer, {});


  const [, _update] = useState({});
  const update = () => _update({});

  const tableInitValue = selection?.tableId;

  useEffect(() => {
    window.location.hash = "id" + resultKey;
  }, [resultKey]);

  const Mode: {
    label: string,
    value: ModeValue
  }[] = [
      {
        label: t('mode.select.simple'),
        value: ModeValue.simple,
      },
      {
        label: t('reg.label'),
        value: ModeValue.reg,
      },
      {
        label: t('dict.json.label.2'),
        value: ModeValue.json
      }
    ]

  useEffect(() => {
    formApi.current?.setValue("field", []);
  }, [fieldMetaList])


  const onSelectTable = (tableIdArr: any) => {
    // 先只做单选一个数据表
    if (!Array.isArray(tableIdArr)) {
      // 可能是semiui的bug，即使是单选，在初始化的时候也是一个数组
      tableIdArr = [tableIdArr];
    }
    //选择表格的时候清空字段选项
    formApi.current?.setValue("field", []);
    setLoading(true);

    // 获取所选择talbe的实例,然后获取所有table的字段信息fieldMetaList
    Promise.allSettled(
      tableIdArr.map((tableId: string) => bitable.base.getTableById(tableId))
    ).then((res) => {
      const allTable: ITable[] = [];
      res.forEach(
        (v: { status: "rejected" | "fulfilled"; value?: ITable; reason?: any }) => {
          if (v.value) {
            allTable.push(v.value);
          } else {
            console.error(v.reason);
          }
        }
      );
      // info.current.table = allTable;
      Promise.allSettled(
        allTable.map(async (t) => {
          const name = tableMetaList?.find((meta) => t.id === meta.id)?.name;
          const fieldMetaLists = await t.getFieldMetaList();
          return {
            table: t,
            name: name || "",
            fieldMetaList: fieldMetaLists,
          };
        })
      )
        .then((fieldMetaLists) => {
          const allFieldMetaList: AllFieldMetaLists = [];
          fieldMetaLists.forEach(
            (f: {
              status: "rejected" | "fulfilled";
              value?: {
                table: ITable;
                fieldMetaList: IFieldMeta[];
                name: string;
              };
              reason?: any;
            }) => {
              if (f.value) {
                allFieldMetaList.push(f.value);
              } else {
                console.error(f.reason);
              }
            }
          );
          setFieldMetaList(allFieldMetaList);
        })
        .finally(() => {
          setLoading(false);
        });
    });
  };

  useEffect(() => {
    bitable.base.getTableMetaList().then((list) => {
      // 过滤出表名不为空字符串的
      setTableMetaList(list.filter(({ name }) => name));
    });
  }, []);


  // 更新table选框的数据源
  useEffect(() => {
    async function getSelection() {
      const selection = await bitable.base.getSelection();
      const table = await bitable.base.getTableById(selection.tableId!);
      setSelection({
        table,
        tableId: table.id,
      });
      formApi.current?.setValue('table', table.id)
      onSelectTable([table.id]);
    }
    if (tableMetaList) {
      getSelection();
    }
  }, [tableMetaList]);
  /** 切换table的时候，所有选项的值集合，表示全选字段 */
  const allFieldsInitValue = useRef<string[]>([]);

  // if (!selection) {
  //   return <div>Loading...</div>;
  // }

  const getFormApi = (form: any) => {
    formApi.current = form;
  };

  const replace = async () => {
    const formValues = formApi.current?.getValues();
    if (formValues) {
      let { findCell, replaceBy, field, table: choosedTableId, view, mode, findCellJson, findCellReg } = formValues;
      /** 正则字符串/字典对象 */
      let findCellValue = findCell
      if (mode === ModeValue.json) {
        try {
          if (findCellJson.trim()[0] === '{') {
            findCellValue = JSON.parse(findCellJson)
          } else {
            throw ('')
          }
        } catch (error) {
          Toast.error(t("json.text"))
          return;
        }
      }

      if (mode === ModeValue.reg) {
        try {
          createRegexFromString(findCellReg)
          findCellValue = findCellReg
        } catch (error) {
          Toast.error(t("reg.text"))
          return;
        }
      }

      /** 所选table实例 */
      let _table: ITable;
      if (choosedTableId && choosedTableId === selection?.tableId) {
        _table = selection?.table!;
      } else {
        _table = await bitable.base.getTableById(choosedTableId);
      }
      /** 所有filed实例 */
      let fields: IField[] = [];

      if (!view || view === ALL) {
        fields = await _table.getFieldList();
      }
      const fieldsType = await Promise.all(
        fields.map(async (f) => {
          const type = await f.getType();
          return {
            type,
            field: f,
          };
        })
      );
      /** 过滤出的支持查找替换的字段实例 */
      let filteredFields = fieldsType
        .filter(({ type }) => {
          if (
            // @ts-ignore
            supportFieldType.includes(+type) ||
            supportFieldType.includes(String(type))
          ) {
            return true;
          }
        })
        .map(({ field }) => field);

      // 过滤出需要查找替换的字段实例
      if (!field.includes(ALL)) {
        const choosedFieldIds = field.map((f: string) => {
          const [fieldTableId, fieldId, fieldType] = f.split(";");
          return fieldId;
        });
        filteredFields = filteredFields.filter((f) => choosedFieldIds.includes(f.id));
      }
      return filteredFields.map(async (f) => {
        const fieldMeta = await f.getMeta();
        let searched = 0;
        let toSetList: ToSetList[] = [];
        let replaceInfo: ReplaceInfo[] = [];
        let total = undefined;
        let remain = undefined;

        let hasMore = true;
        let pageToken: number | undefined = undefined;
        while (hasMore) {
          const { hasMore: currentPageHasMore, fieldValues, total: currentPageRemainTotal, pageToken: currentPageToken } = await f.getFieldValueListByPage({ pageToken });
          pageToken = currentPageToken;
          hasMore = currentPageHasMore;
          if (!total) {
            setStep(fieldValues.length)
            total = currentPageRemainTotal;
          }


          const { toSetList: currentPageTosetList, replaceInfo: currentPageReplaceInfo } = (await replaceCells({
            field: f as any,
            table: _table as any,
            fieldValueList: fieldValues,
            findCell: {
              text: findCell ?? "",
              link: findCell ?? "",
              __value: findCell ?? "",
              __mode: mode,
              __findCellValue: findCellValue
            },
            fieldMeta,
            replaceBy: {
              text: replaceBy ?? "",
              link: replaceBy ?? "",
              __value: replaceBy ?? "",
            },
          })) || {};

          searched += fieldValues.length;
          remain = total - searched;
          setSearchStatus({
            total,
            remain,
            hasMore,
            fieldMeta,
            searched
          })

          toSetList = toSetList.concat(currentPageTosetList ?? []);
          replaceInfo = replaceInfo.concat(currentPageReplaceInfo ?? []);
        }

        const res: ReplaceInfos = {
          toSetList,
          replaceInfo,
          field: f,
          table: _table,
          fieldMeta,
          replaceAll: () => replaceAll(toSetList, _table, f.id, setSetRecordsSuccessedStatus, fieldMeta)
        }
        return res;
      });
    }
  };

  // const singleCellValueTypes = (choosedFieldMeta?.type && Object.values(FiledTypesDesc[choosedFieldMeta?.type])) || []
  const renderFieldSelection = () => {
    allFieldsInitValue.current = [];
    return (
      Array.isArray(fieldMetaList) &&
      fieldMetaList
        .map((fieldMetaInfo) => {
          const selections = fieldMetaInfo.fieldMetaList
            .filter((v) => supportFieldType.includes(String(v.type)))
            .map(({ name, id, type }) => {
              const filedValue = fieldMetaInfo.table.id + ";" + id + ";" + type;
              // @ts-ignore
              const Icon = icons[type];
              allFieldsInitValue.current.push(filedValue);
              return (
                <Form.Select.Option key={id} value={filedValue}>
                  {Icon} <div className="semi-select-option-text">{name}</div>
                </Form.Select.Option>
              );
            });
          return selections;
        })
        .flat(9) //随便填个大于2的数字
    );
  };

  const onClickReplaceAllbtn = async () => {
    if (Array.isArray(replaceInfos) && replaceInfos.length) {
      const waitReplace: Promise<any>[] = [];
      setReplaceAllLoading(true);
      replaceInfos.forEach((v: ReplaceInfos) => {
        waitReplace.push(v.replaceAll());
      });
      const res = await Promise.allSettled(waitReplace);
      setReplaceAllLoading(false);
      const successArr = res
        .map((v) => (v.status == "fulfilled" ? v.value.success : undefined))
        .flat(9)
        .map((v) => v.value.fieldIdRecordId);
      const failedArr = res
        .map((v) => (v.status == "fulfilled" ? v.value.failed : undefined))
        .flat(9)
        .map((v) => v.value.fieldIdRecordId);
      setSeccessed(successArr);
      if (failedArr.length) {
        Toast.success({ content: t("success", { success: successArr.length, err: failedArr.length }), duration: 5 });
        return;
      }
      setlatestSuccessResultKey(resultKey);
      Toast.success({ content: t("success2", { success: successArr.length }), duration: 5 });
    }
  };
  const onClickFindBtn = async () => {
    setFindBtnLoading(true);
    setSeccessed([]);
    try {
      try {
        const v = await replace();
        if (v) {
          await Promise.allSettled(v).then((findRes) => {
            const findResArr = findRes.filter(
              //@ts-ignore
              (r) => r.value && r.value.toSetList.length
            );
            if (findRes.length) {
              // @ts-ignore
              setReplaceInfos(findResArr.map((r_1) => r_1.value));
              setResultKey(new Date().getTime());
            }
          });
        }
      } catch (e) {
        console.error(e);
        Toast.error(`error ${e}`);
      }
    } finally {
      setFindBtnLoading(false);
    }
  };

  const onFormChange = () => {
    update();
    const { table, field, findCell, mode, findCellJson, findCellReg } = formApi.current?.getValues();
    let findIsEmpty = false;
    if (mode === ModeValue.simple) {
      if (findCell === undefined) {
        findIsEmpty = true;
      }
    } else if (mode === ModeValue.json) {
      if (findCellJson === undefined) {
        findIsEmpty = true
      }
    } else if (mode === ModeValue.reg) {
      if (findCellReg === undefined) {
        findIsEmpty = true;
      }
    }
    if (table === undefined || field.length === 0 || findIsEmpty) {
      setDisable(true);
    } else {
      setDisable(false);
    }
  };

  /** 是否有匹配结果 */
  const withResult = Array.isArray(replaceInfos) && replaceInfos.length > 0;

  const ifSelectAll = () => {
    const field = formApi.current?.getValue("field");
    if (!field || !field.length) {
      return false;
    }
    if (field.length === allFieldsInitValue.current.length) {
      return true;
    }
    return false;
  };

  const RenderSearchLoading = () => {
    return <div className="loading-tip">
      {
        Object.keys(searchStatus).map((fieldId) => {
          const { total, remain, hasMore, searched, fieldMeta } = searchStatus[fieldId];
          return hasMore ?
            <div key={fieldMeta.id} className="loading-tip-search">
              {t('search.status', { total, remain, hasMore, searched, name: fieldMeta.name })}
            </div> : null;
        })
      }
    </div>
  }

  const RenderSetRecordsLoading = () => {
    return <div className="loading-tip">
      {
        Object.keys(setRecordsSuccessedStatus).map((fieldId) => {
          const { total, remain, hasMore, successed, fieldMeta, failed } = setRecordsSuccessedStatus[fieldId];
          return <div key={fieldMeta.id} className="loading-tip-search">
            {t('set.status', { total, remain, hasMore, successed, name: fieldMeta.name, failed })}
          </div>
        })
      }
    </div>
  }

  const RenderLoadingTip = () => {
    if (findBtnLoading) {
      return <RenderSearchLoading />
    }
    if (replaceAllLoading) {
      return <RenderSetRecordsLoading />
    }
    return null;
  }

  return (
    <Spin spinning={loading || findBtnLoading || replaceAllLoading} tip={
      <RenderLoadingTip />
    }>
      <div className="container">

        <Form
          disabled={replaceAllLoading || findBtnLoading}
          onChange={onFormChange}
          getFormApi={getFormApi}
        >
          <div>
            <Form.Select
              initValue={mode}
              onChange={(v) => {
                setMode(v as any)
              }}
              field="mode"
              label={t("choose.mode")}
              placeholder={t("placeholder")}
            >
              {Mode.map(({ label, value }) => (
                <Form.Select.Option key={value} value={value}>
                  {label}
                </Form.Select.Option>
              ))}
            </Form.Select>
            <Form.Select
              initValue={tableInitValue}
              onChange={onSelectTable}
              field="table"
              label={t("select.table")}
              placeholder={t("placeholder")}
            >
              {Array.isArray(tableMetaList) &&
                tableMetaList.map((tableMeta) => (
                  <Form.Select.Option key={tableMeta.id} value={tableMeta.id}>
                    {tableMeta.name}
                  </Form.Select.Option>
                ))}
            </Form.Select>
            {
              <Form.Select
                multiple
                initValue={allFieldsInitValue.current}
                outerBottomSlot={
                  <div
                    className="selectAll"
                    onClick={() => {
                      if (ifSelectAll()) {
                        formApi.current?.setValue("field", []);
                      } else {
                        formApi.current!.setValue(
                          "field",
                          [...allFieldsInitValue.current]
                        );
                      }
                      update();
                    }}
                  >
                    <Checkbox checked={ifSelectAll()}></Checkbox>
                    {t("select.all.2")}
                  </div>
                }
                field="field"
                label={t("select.field")}
                placeholder={t("placeholder")}
              >
                {renderFieldSelection()}
              </Form.Select>
            }
          </div>

          {mode === ModeValue.simple && <Form.TextArea
            field="findCell"
            label={t("find.text")}
            placeholder={t("please.enter")}
            onChange={(v) => setSimpleModeSearchValue(v)}
            extraText={/\s/.test(simpleModeSearchValue) ? t('empty.text.tooltip') : ''}
          ></Form.TextArea>}
          {mode === ModeValue.reg && <Form.TextArea
            field="findCellReg"
            label={{
              text: <div>
                {t("reg.label")}
                <div onClick={() => {
                  window.open(regHelp)
                }} className="regHelpText">
                  {t('reg.label.help.text')}
                </div>
              </div>,
            }}
            placeholder="/\n/g"
          ></Form.TextArea>}
          {mode === ModeValue.json && <Form.TextArea
            style={{
              border: '1px solid #1890ff',
              background: '#EEEEEE'
            }}
            rows={10}
            field="findCellJson"
            label={{
              text: t("dict.json.label"),
              extra: <Tooltip content={<p className="pre">
                {t('json.desc')}
              </p>}><IconHelpCircle style={{ color: 'var(--semi-color-text-2)' }} /></Tooltip>
            }}
            placeholder={t("json.text.placeholder")}
          ></Form.TextArea>}
          {(mode === ModeValue.reg || mode === ModeValue.simple) && <Form.TextArea
            field="replaceBy"
            label={t("replace.by")}
            placeholder={t("please.enter")}
          ></Form.TextArea>}
        </Form>
        <div className="findBtnContainer">
          <Button
            loading={findBtnLoading}
            disabled={disable || replaceAllLoading}
            className="bt1"
            theme="solid"
            type="primary"
            onClick={onClickFindBtn}
          >
            {t("find")}
          </Button>
          {(
            <Button
              className="bt2"
              disabled={latestSuccessResultKey === resultKey || !withResult}
              loading={replaceAllLoading}
              theme="solid"
              type="secondary"
              onClick={onClickReplaceAllbtn}
            >
              {replaceAllLoading ? t("replace.in") : t("replace.all")}
            </Button>
          )}
        </div>
        {withResult ? (
          [
            <div id={"id" + resultKey} className="result">
              <p>{t("result")}</p>
              <div>
              </div>
            </div>,
            <div key={resultKey}>
              {replaceInfos.map((i) => (
                <DiffCard successed={successed} key={i.field.id} {...i}></DiffCard>
              ))}
            </div>,
          ]
        ) : resultKey ? (
          <div className="result">
            <p>{t("result")}</p> <div className="emptyResult">{t("empty")}</div>
          </div>
        ) : null}
      </div>
    </Spin >
  );
}
