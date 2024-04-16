import { useState, useRef, useEffect } from 'react'
import { ReplaceInfos } from '../../utils'
import { Button, Toast, Tooltip } from '@douyinfe/semi-ui'
import './styles.css'
import { icons } from '../../icons'
import { useTranslation } from 'react-i18next';


const pageSize = 100


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
  const [page, setPage] = useState(0)
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
        {icons[fieldMeta.type]} {fieldMeta.name} {`(${toSetList.length})`}
      </div>
      <div className="lists">
        <div className="header">
          <div>{t("bf")}</div>
          <div>{t("af")}</div>
          <div className="operation">{t("opt")}</div>
        </div>
        <div>
          {toSetList.slice(page, (page + 1) * pageSize).map((list, toSetListIndex) => {
            const info = replaceInfo.filter((r) => r.recordId === list.recordId);
            const { oldCellValue } = info[0];
            const { recordId, value: newCellValue } = list;
            let diff;
            diff = (
              <div key={list.recordId + toSetListIndex} className="diffCell">
                <div className="old">
                  {Array.isArray(oldCellValue)
                    ? oldCellValue.map((v: any, i) => {
                      return (
                        <span key={list.recordId + i}>
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
                        </span>
                      );
                    })
                    : (oldCellValue as any)}
                </div>
                <div className="new">
                  {Array.isArray(newCellValue)
                    ? newCellValue.map((v: any, i) => {
                      return (
                        <span key={list.recordId + i}>
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
                        </span>
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
        {(page + 1) * pageSize < toSetList?.length && toSetList.length > pageSize && <div
        onClick={()=>setPage(page+1)}
        className='loadMore'>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.638 13.35 12 18.988l-5.943-5.943-.84-.835a1 1 0 1 0-1.409 1.418l.667.663 6.818 6.819a1 1 0 0 0 1.414 0l6.473-6.473 1.013-1.011a.999.999 0 0 0-1.41-1.416l-1.146 1.142Z" fill="#2B2F36" />
            <path d="M17.638 4.443 12 10.08 6.058 4.136l-.84-.835A1 1 0 1 0 3.81 4.72l.667.663 6.818 6.818a1 1 0 0 0 1.414 0l6.473-6.473 1.013-1.011a.999.999 0 0 0-1.41-1.416l-1.146 1.142Z" fill="#2B2F36" />
          </svg>

        </div>}
      </div>
    </div>
  );
}
