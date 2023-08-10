import { useState, useRef, useEffect } from 'react'
import { ReplaceInfos } from '../../utils'
import { Button, Toast, Tooltip } from '@douyinfe/semi-ui'
import './styles.css'
import { icons } from '../../icons'
import { useTranslation } from 'react-i18next';





export default function DiffCard(
  props: ReplaceInfos & {
    successed: string[];
  }
) {
  const { field, fieldMeta, replaceAll, replaceInfo, table, toSetList } = props;

  const [, _update] = useState<any>();
  const update = () => {
    _update({});
  };
  /** 已经设置成功的下标 */
  const settledIndex = useRef<Set<number>>(new Set([-1]));
  const { t } = useTranslation();
  useEffect(() => {
    if (props.successed.length) {
      toSetList.forEach((list, index) => {
        const key = fieldMeta.id + ";" + list.recordId;
        if (props.successed.includes(key)) {
          settledIndex.current.add(index);
        }
      });
    }
    update();
  }, [props.successed.join("")]);
  const fieldId = fieldMeta.id;
  return (
    <div className="d">
      <div className="fieldTitle">
        {/* @ts-ignore */}
        {icons[fieldMeta.type]} {fieldMeta.name}
      </div>
      <div className="lists">
        <div className="header">
          <div>{t("bf")}</div>
          <div>{t("af")}</div>
          <div className="operation">{t("opt")}</div>
        </div>
        <div>
          {toSetList.map((list, toSetListIndex) => {
            const info = replaceInfo.filter((r) => r.recordId === list.recordId);
            const { oldCellValue } = info[0];
            const { recordId, value: newCellValue } = list;
            let diff;
            diff = (
              <div className="diffCell">
                <div className="old">
                  {Array.isArray(oldCellValue)
                    ? oldCellValue.map((v: any, i) => {
                      return (
                        <div key={list.recordId + i}>
                          {/* 在支持查找替换的字段中，文字是text属性，这里需要展示替换前后的内容*/}
                          {v.link ? (
                            <Tooltip
                              content={
                                <div className="scroll">{`${t(
                                  "act.link"
                                )}\n${v.link}`}</div>
                              }
                            >
                              <a href={v.link}>{v.text} </a>
                            </Tooltip>
                          ) : (
                            v.text
                          )}
                        </div>
                      );
                    })
                    : (oldCellValue as any)}
                </div>
                <div className="new">
                  {Array.isArray(newCellValue)
                    ? newCellValue.map((v: any, i) => {
                      return (
                        <div key={list.recordId + i}>
                          {/* 在支持查找替换的字段中，文字是text属性，这里需要展示替换前后的内容， */}
                          {v.link ? (
                            <Tooltip
                              content={
                                <div className="scroll">{`${t(
                                  "act.link"
                                )}\n${v.link}`}</div>
                              }
                            >
                              <a href={v.link}>{v.text} </a>
                            </Tooltip>
                          ) : (
                            v.text
                          )}
                        </div>
                      );
                    })
                    : (newCellValue as any)}
                </div>
              </div>
            );

            if (typeof newCellValue === "string" || typeof newCellValue === "number") {
              diff = (
                <div className="diffCell">
                  <div className="old">{oldCellValue as any}</div>
                  <div className="new">{newCellValue}</div>
                </div>
              );
            }
            return (
              <div key={list.recordId + toSetListIndex} className="diffList">
                {[
                  diff,
                  <div className="btn">
                    <Button
                      className="bt3"
                      disabled={settledIndex.current.has(toSetListIndex)}
                      onClick={() => {
                        table
                          .setCellValue(fieldId, recordId, newCellValue)
                          .then((r) => {
                            if (r) {
                              settledIndex.current.add(
                                toSetListIndex
                              );
                              update();
                            }
                          })
                          .catch((e) => {
                            Toast.error(`${t("set.err")} : ${e}`);
                          });
                      }}
                    >
                      {settledIndex.current.has(toSetListIndex)
                        ? t("replaced")
                        : t("replace")}
                    </Button>
                  </div>,
                ]}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
