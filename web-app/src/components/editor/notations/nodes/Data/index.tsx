import "./style.scss";
import { useEffect, useState } from "react";
import { Handle, NodeProps, Position } from "reactflow";

const Data = ({
  data,
  isConnectable,
  sourcePosition = Position.Bottom,
  targetPosition = Position.Top,
}: NodeProps) => {
  const [name, setName] = useState(data.name);
  const [path, setPath] = useState(data.path);
  const [ddmName, setDdmName] = useState(data.ddmName);
  const [ddmProject, setDdmProject] = useState(data.ddmProject);
  const [sourceType, setSourceType] = useState(data.sourceType ?? "local");

  const handleSourceTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value as "local" | "ddm";
    setSourceType(value);
    data.sourceType = value;

    if(value === "local") {
      delete data.ddmName;
      delete data.ddmProject;
    } else if(value === "ddm") {
      delete data.path;
    }
  }
  
  return (
    <>
    {console.log(data)}
      <div className="node-data">
        <label className="node-data__name">
          <p className="node-data__title">Name</p>
          <input
            className="node-data__input nodrag"
            type="text"
            value={name}
            placeholder="give a name"
            onChange={(e) => {
              setName(e.target.value);
              data.name = e.target.value;
            }}
          />
        </label>
        <label className="node-data__name w-full">
          <p className="node-data__title">Source</p>
          <div className="nodrag flex w-full justify-around" style={{borderBottom: "1px solid #000"}}>
            <label className="node-data__radio flex items-center" style={{ fontSize: "8px" }}>
              <input
                type="radio"
                name="sourceType"
                value="local"
                checked={sourceType === "local"}
                onChange={handleSourceTypeChange}
              />
              Local
            </label>
            <label className="node-data__radio flex items-center" style={{ fontSize: "8px" }}>
              <input
                type="radio"
                name="sourceType"
                value="ddm"
                checked={sourceType === "ddm"}
                onChange={handleSourceTypeChange}
              />
              DDM
            </label>
          </div>
        </label>
        {sourceType === "local" ? (
          <label className="node-data__field">
            <p className="node-data__title">Local specification</p>
            <input
              className="node-data__input nodrag"
              type="text"
              placeholder="Path"
              value={path}
              onChange={(e) => {
                setPath(e.target.value);
                data.path = e.target.value;
              }}
            />
          </label>
        ) : sourceType === "ddm" ? (
          <label className="node-data__field">
            <p className="node-data__title">DDM specification</p>
            <input
              className="node-data__input nodrag"
              type="text"
              placeholder="Name"
              value={ddmName}
              onChange={(e) => {
                setDdmName(e.target.value);
                data.ddmName = e.target.value;
              }}
            />
            <input
              className="node-data__input nodrag"
              type="text"
              placeholder="Project"
              value={ddmProject}
              onChange={(e) => {
                setDdmProject(e.target.value);
                data.ddmProject = e.target.value;
              }}
            />
          </label>
        ) : null}
        <Handle
          type="source"
          position={sourcePosition}
          isConnectable={isConnectable}
        />
        <Handle
          type="target"
          position={targetPosition}
          isConnectable={isConnectable}
        />
      </div>
    </>
  );
};

export default Data;
