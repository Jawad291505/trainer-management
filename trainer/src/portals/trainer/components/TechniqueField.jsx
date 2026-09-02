import { Form, Select } from 'antd'
import { exerciseTechniques, getTechnique } from '../../../services/exerciseLibrary'

// Technique picker (Standard / TUT / Super Set) — a shared, data-driven exercise
// property. Shows the selected technique's description below the control,
// mirroring the reference workout sheet. Drop it into any antd Form; pass that
// form instance so the description can react to the current selection.
export default function TechniqueField({ form, name = 'technique', label = 'Technique' }) {
    const key = Form.useWatch(name, form) || 'standard'
    return (
        <Form.Item
            name={name}
            label={label}
            initialValue="standard"
            tooltip="How the set is performed"
            extra={key !== 'standard' ? getTechnique(key).description : null}
        >
            <Select options={exerciseTechniques.map((t) => ({ value: t.key, label: t.label }))} />
        </Form.Item>
    )
}
