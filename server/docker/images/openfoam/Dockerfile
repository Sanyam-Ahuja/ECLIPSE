FROM opencfd/openfoam-default:2312

# OpenFOAM official image includes MPI
# Add CampuGrid entrypoint wrapper
COPY ../../wrappers/entrypoint_wrapper.sh /campugrid/
RUN chmod +x /campugrid/entrypoint_wrapper.sh

WORKDIR /workspace
ENTRYPOINT ["/campugrid/entrypoint_wrapper.sh"]
