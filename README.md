# Code-Profiling-Dashboard
The code profiling dashboard perform a dynamic analysis on a program and attempt to visulaize its runtime performance. The purpose of this project is to emulate a tool that would allow developers to isolate inefficiencies in a code base or visually inspect the state of a program just before a crash.

The custom code profiler will output data in JSON object format for D3 implementation to readily use. The profiler could either be an instrumented profiler or an injected profiler. It'll capture over a multitude of frames the time spent in each function, the caller of each function in a hierarchy, and the sequence in which these calls were made per frame.
