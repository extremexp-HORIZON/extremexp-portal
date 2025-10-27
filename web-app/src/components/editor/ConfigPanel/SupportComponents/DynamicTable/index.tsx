import React, { useEffect } from "react";
import "./style.scss";
import DropDown from "../DropDown";
import RadioButton from "../RadioButton";
import { useParamStore } from "../../../../../stores/configPanelStore";
import { useImmerReducer } from "use-immer";
import { paramConfigReducer, Action } from "../../TaskConfigPanel/reducer";
import { TaskParameterType } from "../../../../../types/task";

interface DynamicTableProps {
  currentParam: TaskParameterType;
  onParamUpdate: (id: string, param: TaskParameterType) => void;
  onDelete: (id: string) => void;
}

const DynamicTable = (props: DynamicTableProps) => {
  const { currentParam, onParamUpdate, onDelete } = props;
  // const [values, setValues] = useState<any>(null);
  const [paramState, paramDispatch] = useImmerReducer(
    paramConfigReducer,
    currentParam
  );

  // 4. at taskconfigpanel, use currentTaskVariant to map params.
  const handleParamNameChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const action: Action = {
      type: "UPDATE_PARAM_NAME",
      payload: event.target.value,
    };
    paramDispatch(action);
  };

  const handleParamTypeChange = (option: string) => {
    const action: Action = {
      type: "UPDATE_PARAM_TYPE",
      payload: option,
    };
    paramDispatch(action);
    if (option === "range") {
      paramDispatch({
        type: "UPDATE_PARAM_VALUES",
        payload: { min: 0, max: 10, step: 1 },
      });
    } else {
      paramDispatch({ type: "UPDATE_PARAM_VALUES", payload: [] });
    }
  };

  const handleParamArbitraryChange = (option: boolean) => {
    const action: Action = {
      type: "UPDATE_PARAM_ABSTRACT",
      payload: option,
    };
    paramDispatch(action);
  };

  const handleEnterParam = (id: string) => {
    useParamStore.setState({ selectedParamId: id });
  };

  useEffect(() => {
    // Call the function passed from the parent to update the parameter state there
    onParamUpdate(currentParam.id, paramState);
  }, [paramState, currentParam.id, onParamUpdate]);

  const onValueDelete = (index: number) => () => {
    if (Array.isArray(currentParam.values)) {
      console.log("Deleting value at index:", index);
      const newValues = currentParam.values.filter((_, i) => i !== index) as number[] | string[] | boolean[];
      paramDispatch({ type: "UPDATE_PARAM_VALUES", payload: newValues });
    }
  };

  const typeIdentifier = () => {
    switch (paramState.type) {
      case "integer":
        return "number";
      case "string":
        return "text";
      case "boolean":
        return "boolean";
      case "range":
        return "range";
      default:
        return "Unknown";
    }
  };

  const addValue = () => {
    let initValues = currentParam.values;
    if (paramState.type === "integer") {
      initValues = [...(Array.isArray(initValues) ? initValues as number[] : []), 0];
    } else if (paramState.type === "string") {
      initValues = [...(Array.isArray(initValues) ? initValues as string[] : []), ""];
    } else if (paramState.type === "boolean") {
      initValues = [...(Array.isArray(initValues) ? initValues as boolean[] : []), true];
    }
    paramDispatch({ type: "UPDATE_PARAM_VALUES", payload: initValues });
  };

  const onValueChange =
    (index: number, position: "min" | "max" | "step" | null) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;
      console.log("Value change:", value);

      if (paramState.type === "integer" && Array.isArray(paramState.values)) {
        const newValues = [...paramState.values] as number[];
        newValues[index] = value.includes(".") ? parseFloat(value) : parseInt(value ? value : "0");
        paramDispatch({ type: "UPDATE_PARAM_VALUES", payload: newValues });
      } else if (paramState.type === "string" && Array.isArray(paramState.values)) {
        const newValues = [...paramState.values] as string[];
        newValues[index] = value;
        paramDispatch({ type: "UPDATE_PARAM_VALUES", payload: newValues });
      } else if (paramState.type === "boolean" && Array.isArray(paramState.values)) {
        const boolValue = value === "true";
        const newValues = [...paramState.values] as boolean[];
        newValues[index] = boolValue;
        paramDispatch({ type: "UPDATE_PARAM_VALUES", payload: newValues });
      } else if (paramState.type === "range" && !Array.isArray(paramState.values)) {
        const numValue = value.includes(".") ? parseFloat(value) : parseInt(value);
        if (
          position === "min" &&
          numValue > paramState.values.max
        ) {
          return;
        } else if (
          position === "max" &&
          numValue < paramState.values.min
        ) {
          return;
        }
        const newValues = {
          ...paramState.values,
          [position!]: numValue,
        };
        paramDispatch({ type: "UPDATE_PARAM_VALUES", payload: newValues });
      }
    };

  return (
    <div
      className="table-component"
      onClick={() => handleEnterParam(currentParam.id)}
    >
      <div
        className="header-text"
        style={{ display: "flex", justifyContent: "space-between" }}
      >
        <span>{paramState.name}</span>
        <span
          className="iconfont delete-param"
          onClick={() => {
            // Call the function passed from the parent to delete the parameter
            onDelete(currentParam.id);
          }}
        >
          &#xe600;
        </span>
      </div>
      {/* Header Row */}
      <table className="row header-row">
        <thead className="cell">
          <tr>
            <td className="property">Property</td>
          </tr>
        </thead>
        <thead className="cell">
          <tr>
            <td className="value">Value</td>
          </tr>
        </thead>
      </table>

      {/* Data row */}
      <table className={`row `}>
        <tbody className="cell">
          <tr>
            <td className="property"> Name</td>
          </tr>
        </tbody>
        <tbody className="cell">
          <tr>
            <td className="value">
              <input
                type="text"
                className="transparent-input"
                onChange={handleParamNameChange}
                value={paramState.name}
              />
            </td>
          </tr>
        </tbody>
      </table>
      <table className={`row `}>
        <tbody className="cell">
          <tr>
            <td className="property"> Type</td>
          </tr>
        </tbody>
        <tbody className="cell">
          <tr>
            <td className="value">
              <DropDown
                options={["integer", "string", "range", "boolean"]}
                value={paramState.type}
                className="normal__dropdown"
                onOptionSelected={handleParamTypeChange}
              />
            </td>
          </tr>
        </tbody>
      </table>
      <table className={`row `}>
        <tbody className="cell">
          <tr>
            <td className="property"> Abstract</td>
          </tr>
        </tbody>
        <tbody className="cell">
          <tr>
            <td className="value">
              <RadioButton
                key={`abstract-${paramState.id}`}
                choices={[
                  { label: "yes", value: "yes" },
                  { label: "no", value: "no" },
                ]}
                defaultValue={paramState.abstract ? "yes" : "no"}
                onOptionSelected={handleParamArbitraryChange}
                name={`abstract-${paramState.id}`}
              />
            </td>
          </tr>
        </tbody>
      </table>
      {paramState.type === "integer" ||
      paramState.type === "string" ||
      paramState.type === "boolean" ? (
        <>
          <table className={`row `}>
            <tbody className="cell">
              <tr>
                <td className="property"> Default Values</td>
              </tr>
            </tbody>
            <tbody className="cell">
              <tr>
                <td className="value">
                  <span className="iconfont cursor-pointer" onClick={addValue}>
                    &#xe601;
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          {Array.isArray(currentParam.values) &&
            currentParam.values.map((value: number | string | boolean, index: number) => (
              <table className={`row`} key={`value-${index}`}>
                <tbody className="cell flex">
                  <tr>
                    <td className="property">value_{index}</td>
                  </tr>
                </tbody>
                <tbody className="cell flex justify-between">
                  <tr>
                    <td className="value">
                      {paramState.type === "integer" ||
                      paramState.type === "string" ? (
                        <input
                          type={typeIdentifier()}
                          className="border-2"
                          placeholder="Type here"
                          key={index}
                          style={{ width: "100%" }}
                          value={String(value)}
                          onChange={onValueChange(index, null)}
                        />
                      ) : (
                        <div className="normal__dropdown">
                          <select
                            value={String(value)}
                            onChange={onValueChange(index, null)}
                          >
                            <option value="true">True</option>
                            <option value="false">False</option>
                          </select>
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="value">
                      <span
                        className="iconfont delete-param"
                        onClick={onValueDelete(index)}
                      >
                        &#xe600;
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            ))}
        </>
      ) : paramState.type === "range" && !Array.isArray(currentParam.values) ? (
        <table className={`row `}>
          <tbody className="cell">
            <tr>
              <td className="property">values</td>
            </tr>
          </tbody>
          <tbody className="cell flex justify-between">
            <tr>
              <td>
                <span>Min:</span>
                <input
                  type={"number"}
                  className="border-2"
                  placeholder="Min"
                  key={"min-value"}
                  style={{ width: "5em", marginLeft: "0.5em" }}
                  value={currentParam.values.min}
                  onChange={onValueChange(0, "min")}
                />
              </td>
            </tr>
            <tr>
              <td>
                <span>Max:</span>
                <input
                  type={"number"}
                  className="border-2"
                  placeholder="Max"
                  key={"max-value"}
                  style={{ width: "5em", marginLeft: "0.5em" }}
                  value={currentParam.values.max}
                  onChange={onValueChange(0, "max")}
                />
              </td>
            </tr>
            <tr>
              <td>
                <span>Step:</span>
                <input
                  type={"number"}
                  className="border-2"
                  placeholder="Step"
                  key={"step-value"}
                  style={{ width: "5em", marginLeft: "0.5em" }}
                  value={currentParam.values.step}
                  onChange={onValueChange(0, "step")}
                />
              </td>
            </tr>
          </tbody>
        </table>
      ) : null}
    </div>
  );
};

export default DynamicTable;
