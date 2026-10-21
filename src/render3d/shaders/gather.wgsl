// Gathers a flow's state and grid nodes from a solver's buffers into the
// 3D view's own (which it can copy to read back): the solver's buffers are
// bound as storage, as the solver binds them, and need no other usage.
// Nodes of a fitted shock's moving grid are placed as the 2D view's
// flow_nodes places them (src/render/shaders/flow-fields.wgsl), the CPU
// twin being nodesOnLines of src/render3d/field.ts.

struct Gather {
  ni: u32,
  nj: u32,
  // 1: nodes placed from lines, fractions and heights; 0: nodes given.
  on_lines: u32,
  _pad: u32,
};

@group(0) @binding(0) var<uniform> params: Gather;
@group(0) @binding(1) var<storage, read> state_in: array<vec4f>;
@group(0) @binding(2) var<storage, read> lines: array<vec4f>;
@group(0) @binding(3) var<storage, read> fractions: array<f32>;
@group(0) @binding(4) var<storage, read> heights: array<f32>;
@group(0) @binding(5) var<storage, read> nodes_in: array<vec2f>;
@group(0) @binding(6) var<storage, read_write> state_out: array<vec4f>;
@group(0) @binding(7) var<storage, read_write> nodes_out: array<vec2f>;

@compute @workgroup_size(64)
fn gather(@builtin(global_invocation_id) id: vec3u) {
  let n = id.x;
  if (n < params.ni * params.nj) {
    state_out[n] = state_in[n];
  }
  if (n < (params.ni + 1u) * (params.nj + 1u)) {
    if (params.on_lines == 1u) {
      let i = n % (params.ni + 1u);
      let line = lines[i];
      let height = heights[i] + heights[3u * params.ni + 2u + i];
      nodes_out[n] = line.xy + height * fractions[n] * line.zw;
    } else {
      nodes_out[n] = nodes_in[n];
    }
  }
}
