import { useState, type ReactNode } from "react"

type PanelProps = {
    title: string
    left: boolean
    children: ReactNode
}

export function PanelContainer({ title, left, children }: PanelProps) {
    const [collapsed, setCollapsed] = useState<boolean>(false);
    const leftIcon = "fa fa-angle-left";
    const rightIcon = "fa fa-angle-right";
    return (

        <>
            <div id="shapebar" className="panel overflow-auto h-screen">
                {!collapsed && <h2>{title}</h2>}
                <button onClick={() => setCollapsed(!collapsed)}>
                    {collapsed ? <i className={`${!left ? leftIcon : rightIcon}`}></i> : <i className={`${left ? leftIcon : rightIcon}`}></i>}
                </button>
                {!collapsed &&
                    children
                }
            </div>
        </>


    )
}